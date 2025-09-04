/**
 * Authentication Context
 * Manages user authentication state with secure key management (no service indirection)
 */

import { storageManager } from "@/lib/storage";
import { KDF } from "@/lib/storage/services/KeyDerivationService";
import type { KeyGenerationResult } from "@/utils/crypto";
import { restoreFromMnemonic } from "@/utils/crypto";
import { getAccountKey } from "@/utils/accountKey";
import { type ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

interface AuthState {
  publicKey: string | null;
  privateKey: string | null;
  mnemonic: string[] | null;
  accountKey: bigint | null;
}

interface QuickAuthState {
  show: boolean;
  accountName: string;
}

interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  isRestoringSession: boolean;

  // Account keys
  publicKey: string | null;
  privateKey: string | null;
  mnemonic: string[] | null;
  accountKey: bigint | null;

  // Session restoration state
  quickAuthState: QuickAuthState | null;

  // Actions
  setKeys: (keys: KeyGenerationResult) => void;
  signOut: () => void;
  handleQuickPasswordAuth: (password: string) => Promise<void>;
  dismissQuickAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    publicKey: null,
    privateKey: null,
    mnemonic: null,
    accountKey: null,
  });

  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [quickAuthState, setQuickAuthState] = useState<QuickAuthState | null>(null);

  // Prevent multiple concurrent restoration attempts (React Strict Mode protection)
  const restorationAttempted = useRef(false);

  // Derived state: authenticated if we have the necessary keys
  const isAuthenticated = useMemo(() => {
    return !!(authState.privateKey && authState.mnemonic && authState.accountKey);
  }, [authState]);

  // Session restoration effect (now using KDF + storageManager directly)
  useEffect(() => {
    // Prevent multiple concurrent restoration attempts
    if (restorationAttempted.current) return;
    restorationAttempted.current = true;

    const restoreSession = async () => {
      try {
        const resume = await KDF.resumeAuth();
        if (resume.status === "none") {
          setIsRestoringSession(false);
          return;
        }

        if (resume.status === "password-needed") {
          setQuickAuthState({ show: true, accountName: resume.accountName });
          return;
        }

        // passkey-ready
        const { result, accountName } = resume;
        await storageManager.initializeAccountSession(accountName, result.symmetricKey);
        const accountData = await storageManager.getAccountData();
        if (!accountData) throw new Error("Account data not found");

        const restored = restoreFromMnemonic(accountData.mnemonic);
        setAuthState({
          publicKey: restored.publicKey,
          privateKey: restored.privateKey,
          mnemonic: accountData.mnemonic,
          accountKey: getAccountKey({ privateKey: restored.privateKey, mnemonic: accountData.mnemonic }),
        });
        setIsRestoringSession(false);
      } catch (error) {
        console.error("Session restoration failed:", error);
        if (error instanceof Error && error.message.includes("A request is already pending")) {
          console.warn("WebAuthn request collision detected, skipping session clear");
        } else {
          storageManager.clearSession();
          await KDF.clearSessionInfo();
        }
        setIsRestoringSession(false);
      }
    };

    restoreSession();
  }, []);

  const setKeys = (newKeys: KeyGenerationResult) => {
    setAuthState({
      publicKey: newKeys.publicKey,
      privateKey: newKeys.privateKey,
      mnemonic: newKeys.mnemonic,
      accountKey: (() => {
        try {
          return getAccountKey({ privateKey: newKeys.privateKey, mnemonic: newKeys.mnemonic });
        } catch {
          return null;
        }
      })(),
    });
  };

  const handleQuickPasswordAuth = async (password: string) => {
    if (!quickAuthState) return;

    try {
      const { symmetricKey } = await KDF.deriveKeyFromPassword(password, quickAuthState.accountName);
      await storageManager.initializeAccountSession(quickAuthState.accountName, symmetricKey);
      const accountData = await storageManager.getAccountData();
      if (!accountData) throw new Error("Account data not found");
      const restored = restoreFromMnemonic(accountData.mnemonic);
      setAuthState({
        publicKey: restored.publicKey,
        privateKey: restored.privateKey,
        mnemonic: accountData.mnemonic,
        accountKey: getAccountKey({ privateKey: restored.privateKey, mnemonic: accountData.mnemonic }),
      });
      await KDF.storeSessionInfo(quickAuthState.accountName, "password");
      setQuickAuthState(null);
      setIsRestoringSession(false);
    } catch (error) {
      console.error("Quick password auth failed:", error);
      throw error;
    }
  };

  const dismissQuickAuth = async () => {
    setQuickAuthState(null);
    setIsRestoringSession(false);
    storageManager.clearSession();
    await KDF.clearSessionInfo();
  };

  const signOut = async () => {
    setAuthState({
      publicKey: null,
      privateKey: null,
      mnemonic: null,
      accountKey: null,
    });
    storageManager.clearSession();
    await KDF.clearSessionInfo();
    setQuickAuthState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isRestoringSession,
        publicKey: authState.publicKey,
        privateKey: authState.privateKey,
        mnemonic: authState.mnemonic,
        accountKey: authState.accountKey,
        quickAuthState,
        setKeys,
        signOut,
        handleQuickPasswordAuth,
        dismissQuickAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
