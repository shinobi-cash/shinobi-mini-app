/**
 * Data Type Interfaces - Exact matches to current implementation
 * These maintain 100% compatibility with existing data structures
 */

// Re-export from current implementation to maintain compatibility
export interface Note {
  poolAddress: string;
  depositIndex: number;
  changeIndex: number;
  amount: string;
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
  status: "unspent" | "spent";
  label: string;
}

export type NoteChain = Note[];

export interface CachedNoteData {
  poolAddress: string;
  publicKey: string;
  notes: NoteChain[];
  lastUsedDepositIndex: number;
  lastSyncTime: number;
  lastProcessedCursor?: string;
}

export interface CachedAccountData {
  accountName: string;
  mnemonic: string[];
  createdAt: number;
}

export interface NamedPasskeyData {
  accountName: string;
  credentialId: string;
  challenge: string;
  publicKeyHash: string;
  created: number;
}

export interface DiscoveryResult {
  notes: NoteChain[];
  lastUsedIndex: number;
  newNotesFound: number;
  lastProcessedCursor?: string;
}

// Internal encryption types - exact match to current implementation
export interface EncryptedData {
  iv: Uint8Array;
  data: Uint8Array;
  salt: Uint8Array;
}

export interface StoredEncryptedData {
  id: string;
  publicKeyHash: string;
  poolAddressHash: string;
  encryptedPayload: {
    iv: string;
    data: string;
    salt: string;
  };
  lastSyncTime: number;
}

// Session types - from keyDerivation.ts
export interface SessionInfo {
  accountName: string;
  authMethod: "passkey" | "password";
  lastAuthTime: number;
  environment: "iframe" | "native";
  credentialId?: string;
}
