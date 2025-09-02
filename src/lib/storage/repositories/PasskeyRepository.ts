/**
 * Passkey Repository - Passkey credential storage operations
 * Maintains exact logic and data compatibility with current noteCache passkey methods
 */

import type { NamedPasskeyData } from "../interfaces/IDataTypes";
import type { IndexedDBAdapter } from "../adapters/IndexedDBAdapter";

export class PasskeyRepository {
  constructor(private storageAdapter: IndexedDBAdapter) {}

  /**
   * Store passkey data - exact implementation from noteCache.storePasskeyData
   */
  async storePasskeyData(passkeyData: NamedPasskeyData): Promise<void> {
    await this.storageAdapter.set(passkeyData);
  }

  /**
   * Get passkey data by account name - exact implementation from noteCache.getPasskeyData
   */
  async getPasskeyData(accountName: string): Promise<NamedPasskeyData | null> {
    const result = await this.storageAdapter.get(accountName);
    return result || null;
  }

  /**
   * Check if passkey exists - exact implementation from noteCache.passkeyExists
   */
  async passkeyExists(accountName: string): Promise<boolean> {
    try {
      const passkeyData = await this.getPasskeyData(accountName);
      return passkeyData !== null;
    } catch (error) {
      console.warn("Failed to check passkey existence:", error);
      return false;
    }
  }
}