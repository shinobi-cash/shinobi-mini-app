/**
 * Session Storage Provider Interface
 * Abstracts storage operations for session service
 */

export interface ISessionStorageProvider {
  /**
   * Clear session data from memory
   */
  clearSession(): void;

  /**
   * Clear all cached data (for logout/session end)
   */
  clearAllData(): Promise<void>;

  /**
   * Check if there's any encrypted data in storage
   */
  hasEncryptedData(accountName?: string): boolean;
}
