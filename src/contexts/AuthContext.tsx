import { createContext, useContext, useState, ReactNode } from 'react'
import { AuthState } from '../types/auth'

interface AuthContextType extends AuthState {
  signInWithPasskey: () => Promise<void>
  createPasskey: () => Promise<void>
  signOut: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    mnemonic: null,
    nullifier: null,
    secret: null,
  })
  const [isLoading, setIsLoading] = useState(false)

  const signInWithPasskey = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement passkey authentication
      console.log('Sign in with passkey')
    } catch (error) {
      console.error('Passkey sign in failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createPasskey = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement passkey creation
      console.log('Create passkey')
    } catch (error) {
      console.error('Passkey creation failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = () => {
    setAuthState({
      isAuthenticated: false,
      user: null,
      mnemonic: null,
      nullifier: null,
      secret: null,
    })
  }

  return (
    <AuthContext.Provider value={{
      ...authState,
      signInWithPasskey,
      createPasskey,
      signOut,
      isLoading,
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