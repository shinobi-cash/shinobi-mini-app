/**
 * Session Service - Pure business logic
 * Extracted from useEncryptedStorage.ts to separate session management from React coupling
 */

import type { ISessionStorageProvider } from "./interfaces/ISessionStorageProvider";

export class SessionService {
  constructor(private storageProvider: ISessionStorageProvider) {}

  /**
   * Clear session data from memory - exact logic from useEncryptedStorage.ts
   */
  clearSession(): void {
    this.storageProvider.clearSession();
  }

  /**
   * Clear all data including passkeys - exact logic from useEncryptedStorage.ts
   */
  async clearAllData(): Promise<void> {
    try {
      await this.storageProvider.clearAllData();
      this.clearSession();
    } catch (error) {
      console.error("Failed to clear all data:", error);
      throw error;
    }
  }

  /**
   * Check if there's any encrypted data in storage - exact logic from useEncryptedStorage.ts
   */
  hasEncryptedData(accountName?: string): boolean {
    try {
      return this.storageProvider.hasEncryptedData(accountName);
    } catch (error) {
      console.warn("Failed to check encrypted data:", error);
      return false;
    }
  }
}
