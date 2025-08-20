import { KeyGenerationResult } from '@/utils/crypto';
import { createContext, useContext, useState, ReactNode } from 'react'


interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  
  // Account keys
  publicKey: string | null;
  privateKey: string | null;
  mnemonic: string[] | null;
  
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

  // Simple derived state - authenticated if we have the necessary keys
  const isAuthenticated = !!(keys.privateKey && keys.mnemonic);

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

