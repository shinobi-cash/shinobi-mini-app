import { KeyGenerationResult } from '@/utils/crypto';
import { getAccountKey } from '@/utils/accountKey';
import { createContext, useContext, useState, ReactNode, useMemo } from 'react'


interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  
  // Account keys
  publicKey: string | null;
  privateKey: string | null;
  mnemonic: string[] | null;
  accountKey: bigint | null; 
  
  // Actions
  setKeys: (keys: KeyGenerationResult) => void;
  signOut: () => void;
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

  const setKeys = (newKeys: KeyGenerationResult) => {
    setKeysState({
      publicKey: newKeys.publicKey,
      privateKey: newKeys.privateKey,
      mnemonic: newKeys.mnemonic,
    });
  };

  const signOut = () => {
    setKeysState({
      publicKey: null,
      privateKey: null,
      mnemonic: null,
    });
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      mnemonic: keys.mnemonic,
      accountKey,
      setKeys,
      signOut,
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

