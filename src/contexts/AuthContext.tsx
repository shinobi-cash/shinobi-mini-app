import { KeyGenerationResult } from '@/utils/crypto';
import { getAccountKey } from '@/utils/accountKey';
import { restoreFromMnemonic } from '@/utils/crypto';
import { KDF } from '@/lib/keyDerivation';
import { noteCache } from '@/lib/noteCache';
import { createContext, useContext, useState, ReactNode, useMemo, useEffect, useRef } from 'react'


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
  quickAuthState: {
    show: boolean;
    accountName: string;
  } | null;
  
  // Actions
  setKeys: (keys: KeyGenerationResult) => void;
  signOut: () => void;
  handleQuickPasswordAuth: (password: string) => Promise<void>;
  dismissQuickAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [keys, setKeysState] = useState<{
    publicKey: string | null;
    privateKey: string | null;
    mnemonic: string[] | null;
  }>({
    publicKey: null,
    privateKey: null,
    mnemonic: null,
  });

  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [quickAuthState, setQuickAuthState] = useState<{
    show: boolean;
    accountName: string;
  } | null>(null);

  // Prevent multiple concurrent restoration attempts (React Strict Mode protection)
  const restorationAttempted = useRef(false);

  // Derived state: parse account key once when keys change
  const accountKey = useMemo(() => {
    try {
      return getAccountKey({
        privateKey: keys.privateKey || undefined,
        mnemonic: keys.mnemonic || undefined,
      });
    } catch {
      return null;
    }
  }, [keys.privateKey, keys.mnemonic]);

  // Simple derived state - authenticated if we have the necessary keys
  const isAuthenticated = !!(keys.privateKey && keys.mnemonic && accountKey);

  // Session restoration effect
  useEffect(() => {
    // Prevent multiple concurrent restoration attempts (React Strict Mode protection)
    if (restorationAttempted.current) return;
    restorationAttempted.current = true;

    const restoreSession = async () => {
      try {
        const result = await KDF.resumeAuth();
        
        if (result.status === 'passkey-ready') {
          // Auto-restore passkey session
          await restoreFromSessionKey(result.result.symmetricKey, result.accountName);
          setIsRestoringSession(false);
        } else if (result.status === 'password-needed') {
          // Show password prompt for this specific account - keep splash screen
          setQuickAuthState({ 
            show: true, 
            accountName: result.accountName 
          });
          // Don't set isRestoringSession to false here - keep splash screen visible
        } else {
          // status === 'none', show normal login flow
          setIsRestoringSession(false);
        }
      } catch (error) {
        console.error('Session restoration failed:', error);
        // Only clear session if it's actually invalid, not if it's a concurrent request error
        if (error instanceof Error && error.message.includes('A request is already pending')) {
          // Don't clear session for concurrent WebAuthn requests - just log and continue
          console.warn('WebAuthn request collision detected, skipping session clear');
        } else {
          // Clear session for other types of errors (invalid session, timeout, etc.)
          KDF.clearSessionInfo();
        }
        setIsRestoringSession(false);
      }
    };

    restoreSession();
  }, []);

  const restoreFromSessionKey = async (symmetricKey: CryptoKey, accountName: string) => {
    try {
      // Initialize noteCache with the derived key
      await noteCache.initializeAccountSession(accountName, symmetricKey);

      // Retrieve and restore account keys
      const accountData = await noteCache.getAccountData();
      if (!accountData) {
        throw new Error('Account data not found');
      }

      // Restore keys from mnemonic
      const restoredKeys = restoreFromMnemonic(accountData.mnemonic);
      setKeysState({
        publicKey: restoredKeys.publicKey,
        privateKey: restoredKeys.privateKey,
        mnemonic: accountData.mnemonic,
      });
    } catch (error) {
      console.error('Failed to restore from session key:', error);
      throw error;
    }
  };

  const setKeys = (newKeys: KeyGenerationResult) => {
    setKeysState({
      publicKey: newKeys.publicKey,
      privateKey: newKeys.privateKey,
      mnemonic: newKeys.mnemonic,
    });
  };

  const handleQuickPasswordAuth = async (password: string) => {
    if (!quickAuthState) return;

    try {
      const { symmetricKey } = await KDF.deriveKeyFromPassword(password, quickAuthState.accountName);
      await restoreFromSessionKey(symmetricKey, quickAuthState.accountName);
      
      // Update session timestamp
      KDF.storeSessionInfo(quickAuthState.accountName, 'password');
      
      setQuickAuthState(null);
      setIsRestoringSession(false); // Complete the session restoration
    } catch (error) {
      console.error('Quick password auth failed:', error);
      throw error;
    }
  };

  const dismissQuickAuth = () => {
    setQuickAuthState(null);
    setIsRestoringSession(false); // End session restoration when dismissed
    KDF.clearSessionInfo();
  };

  const signOut = () => {
    setKeysState({
      publicKey: null,
      privateKey: null,
      mnemonic: null,
    });
    noteCache.clearSession();
    KDF.clearSessionInfo();
    setQuickAuthState(null);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isRestoringSession,
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      mnemonic: keys.mnemonic,
      accountKey,
      quickAuthState,
      setKeys,
      signOut,
      handleQuickPasswordAuth,
      dismissQuickAuth,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

