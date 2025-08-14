import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthState, UserProfile } from '../types/auth'
import { useSetupStore } from '../stores/setupStore'

interface AuthContextType extends AuthState {
  signInWithPasskey: () => Promise<void>
  signOut: () => void
  isLoading: boolean
  needsSetup: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const setupStore = useSetupStore()
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isSetupComplete: false,
    user: null,
    mnemonic: null,
  })
  const [isLoading, setIsLoading] = useState(false)

  // Check if user has completed setup on mount
  useEffect(() => {
    const checkSetupStatus = () => {
      const { isComplete, publicKey, privateKey, mnemonic } = setupStore
      if (isComplete && publicKey && privateKey && mnemonic) {
        // User has completed setup, create user profile
        const userProfile: UserProfile = {
          id: `user_${Date.now()}`,
          publicKey,
          privateKey,
          address: deriveAddressFromPublicKey(publicKey),
          createdAt: new Date().toISOString(),
          lastSignIn: new Date().toISOString(),
        }
        setAuthState({
          isAuthenticated: true,
          isSetupComplete: true,
          user: userProfile,
          mnemonic,
        })
      }
    }
    checkSetupStatus()
  }, [setupStore])

  const signInWithPasskey = async () => {
    setIsLoading(false)
    // Passkey sign in is not supported in this flow
  }

  const signOut = () => {
    // Clear auth state and reset setup store for full sign out
    setAuthState(prev => ({
      ...prev,
      isAuthenticated: false,
      user: null,
    }))
    setupStore.resetSetup()
  }

  const needsSetup = (): boolean => {
    return !setupStore.isComplete
  }

  return (
    <AuthContext.Provider value={{
      ...authState,
      signInWithPasskey,
      signOut,
      isLoading,
      needsSetup,
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

// Helper function to derive address from public key
function deriveAddressFromPublicKey(publicKey: string): string {
  // This is a simplified version - in a real app you'd use proper cryptographic functions
  // For now, we'll extract from the public key format or generate a mock address
  return publicKey.slice(2, 42) // Extract first 20 bytes as address
}