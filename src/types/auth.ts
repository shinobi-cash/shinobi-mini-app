// Authentication and passkey types
export interface PasskeyCredential {
  id: string
  publicKey: ArrayBuffer
  authenticatorData: ArrayBuffer
  signature: ArrayBuffer
}

export interface UserProfile {
  id: string
  passkeyId: string
  publicKey: string
  createdAt: string
  lastSignIn: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: UserProfile | null
  mnemonic: string | null
  nullifier: string | null
  secret: string | null
}