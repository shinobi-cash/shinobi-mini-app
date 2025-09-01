/**
 * Storage Provider Adapter
 * Bridges refactored storage to note discovery service interface
 */

import type { INoteStorageProvider } from "../interfaces/INoteStorageProvider";
import type { DiscoveryResult, NoteChain } from "@/lib/storage-refactored/interfaces/IDataTypes";
import { storageManager } from "@/lib/storage-refactored";

export class StorageProviderAdapter implements INoteStorageProvider {
  async getCachedNotes(publicKey: string, poolAddress: string): Promise<DiscoveryResult | null> {
    return storageManager.getCachedNotes(publicKey, poolAddress);
  }

  async storeDiscoveredNotes(
    publicKey: string,
    poolAddress: string,
    notes: NoteChain[],
    lastProcessedCursor?: string
  ): Promise<void> {
    return storageManager.storeDiscoveredNotes(publicKey, poolAddress, notes, lastProcessedCursor);
  }

  async getNextDepositIndex(publicKey: string, poolAddress: string): Promise<number> {
    return storageManager.getNextDepositIndex(publicKey, poolAddress);
  }

  async updateLastUsedDepositIndex(publicKey: string, poolAddress: string, depositIndex: number): Promise<void> {
    return storageManager.updateLastUsedDepositIndex(publicKey, poolAddress, depositIndex);
  }
}