// Authentication and passkey types
export interface PasskeyCredential {
  id: string
  publicKey: ArrayBuffer
  authenticatorData: ArrayBuffer
  signature: ArrayBuffer
}

export interface UserProfile {
  id: string;
  publicKey: string;
  privateKey: string;
  address: string;
  createdAt: string;
  lastSignIn: string;
}

export interface AuthState {
  isAuthenticated: boolean
  isSetupComplete: boolean
  user: UserProfile | null
  mnemonic: string[] | null
}