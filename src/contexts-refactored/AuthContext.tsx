/**
 * Refactored Authentication Context
 * Separates React state management from authentication business logic and storage
 */

import type { KeyGenerationResult } from "@/utils/crypto";
import { type ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthenticationService, type AuthState, type QuickAuthState } from "@/lib/services-refactored/AuthenticationService";
import { AuthStorageProviderAdapter } from "@/lib/services-refactored/adapters/AuthStorageProviderAdapter";

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

// Create service instances
const storageProvider = new AuthStorageProviderAdapter();
const authService = new AuthenticationService(storageProvider);

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
    return authService.isAuthenticated(authState);
  }, [authState]);

  // Session restoration effect - exact logic from AuthContext.tsx
  useEffect(() => {
    // Prevent multiple concurrent restoration attempts
    if (restorationAttempted.current) return;
    restorationAttempted.current = true;

    const restoreSession = async () => {
      try {
        const result = await authService.restoreSession();

        if (result.status === "passkey-ready" && result.authState) {
          setAuthState(result.authState);
          setIsRestoringSession(false);
        } else if (result.status === "password-needed" && result.quickAuthState) {
          setQuickAuthState(result.quickAuthState);
          // Don't set isRestoringSession to false here - keep splash screen visible
        } else {
          // status === 'none', show normal login flow
          setIsRestoringSession(false);
        }
      } catch (error) {
        console.error("Session restoration failed:", error);
        // Handle concurrent request errors vs actual session errors
        if (error instanceof Error && error.message.includes("A request is already pending")) {
          console.warn("WebAuthn request collision detected, skipping session clear");
        } else {
          await authService.signOut();
        }
        setIsRestoringSession(false);
      }
    };

    restoreSession();
  }, []);

  const setKeys = (newKeys: KeyGenerationResult) => {
    const newAuthState = authService.createAuthStateFromKeys(newKeys);
    setAuthState(newAuthState);
  };

  const handleQuickPasswordAuth = async (password: string) => {
    if (!quickAuthState) return;

    try {
      const newAuthState = await authService.handleQuickPasswordAuth(password, quickAuthState.accountName);
      setAuthState(newAuthState);
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
    await authService.signOut();
  };

  const signOut = async () => {
    setAuthState({
      publicKey: null,
      privateKey: null,
      mnemonic: null,
      accountKey: null,
    });
    await authService.signOut();
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