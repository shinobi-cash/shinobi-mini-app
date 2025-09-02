/**
 * Authentication Storage Provider Adapter
 * Bridges refactored storage and key derivation to authentication service interface
 */

import type { IAuthStorageProvider, DerivedKeyResult } from "../interfaces/IAuthStorageProvider";
import type { CachedAccountData, SessionInfo } from "@/lib/storage/interfaces/IDataTypes";
import { storageManager } from "@/lib/storage";
import { KDF } from "@/lib/storage";

export class AuthStorageProviderAdapter implements IAuthStorageProvider {
  /**
   * Initialize account session
   */
  async initializeAccountSession(accountName: string, symmetricKey: CryptoKey): Promise<void> {
    return storageManager.initializeAccountSession(accountName, symmetricKey);
  }

  /**
   * Clear session
   */
  clearSession(): void {
    storageManager.clearSession();
  }

  /**
   * Get account data
   */
  async getAccountData(): Promise<CachedAccountData | null> {
    return storageManager.getAccountData();
  }

  /**
   * Store account data
   */
  async storeAccountData(accountData: CachedAccountData): Promise<void> {
    return storageManager.storeAccountData(accountData);
  }

  /**
   * Store session info
   */
  async storeSessionInfo(
    accountName: string,
    authMethod: "passkey" | "password",
    opts?: { credentialId?: string },
  ): Promise<void> {
    return storageManager.storeSessionInfo(accountName, authMethod, opts);
  }

  /**
   * Get stored session info
   */
  async getStoredSessionInfo(): Promise<SessionInfo | null> {
    return storageManager.getStoredSessionInfo();
  }

  /**
   * Clear session info
   */
  async clearSessionInfo(): Promise<void> {
    return storageManager.clearSessionInfo();
  }

  /**
   * Update session last auth
   */
  async updateSessionLastAuth(): Promise<void> {
    return storageManager.updateSessionLastAuth();
  }

  /**
   * Derive key from password
   */
  async deriveKeyFromPassword(password: string, accountName: string): Promise<DerivedKeyResult> {
    return KDF.deriveKeyFromPassword(password, accountName);
  }

  /**
   * Derive key from passkey
   */
  async deriveKeyFromPasskey(accountName: string, credentialId: string): Promise<DerivedKeyResult> {
    return KDF.deriveKeyFromPasskey(accountName, credentialId);
  }
}
