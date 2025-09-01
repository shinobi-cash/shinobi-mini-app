/**
 * Authentication Storage Provider Interface
 * Abstracts storage operations for authentication service
 */

import type { CachedAccountData, SessionInfo } from "@/lib/storage-refactored/interfaces/IDataTypes";

export interface DerivedKeyResult {
  symmetricKey: CryptoKey;
  salt: Uint8Array;
}

export interface IAuthStorageProvider {
  /**
   * Session management
   */
  initializeAccountSession(accountName: string, symmetricKey: CryptoKey): Promise<void>;
  clearSession(): void;

  /**
   * Account data operations
   */
  getAccountData(): Promise<CachedAccountData | null>;
  storeAccountData(accountData: CachedAccountData): Promise<void>;

  /**
   * Session info operations
   */
  storeSessionInfo(accountName: string, authMethod: "passkey" | "password", opts?: { credentialId?: string }): Promise<void>;
  getStoredSessionInfo(): Promise<SessionInfo | null>;
  clearSessionInfo(): Promise<void>;
  updateSessionLastAuth(): Promise<void>;

  /**
   * Key derivation operations
   */
  deriveKeyFromPassword(password: string, accountName: string): Promise<DerivedKeyResult>;
  deriveKeyFromPasskey(accountName: string, credentialId: string): Promise<DerivedKeyResult>;
}