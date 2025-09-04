/**
 * Session Storage Provider Adapter
 * Bridges refactored storage to session service interface
 */

import { storageManager } from "@/lib/storage";
import type { ISessionStorageProvider } from "../interfaces/ISessionStorageProvider";

export class SessionStorageProviderAdapter implements ISessionStorageProvider {
  clearSession(): void {
    storageManager.clearSession();
  }

  async clearAllData(): Promise<void> {
    return storageManager.clearAllData();
  }

  hasEncryptedData(accountName?: string): boolean {
    return storageManager.hasEncryptedData(accountName);
  }
}
