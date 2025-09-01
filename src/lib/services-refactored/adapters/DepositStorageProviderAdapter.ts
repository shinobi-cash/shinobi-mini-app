/**
 * Deposit Storage Provider Adapter
 * Bridges refactored storage to deposit service interface
 */

import type { IDepositStorageProvider } from "../interfaces/IDepositStorageProvider";
import { storageManager } from "@/lib/storage-refactored";

export class DepositStorageProviderAdapter implements IDepositStorageProvider {
  async getNextDepositIndex(publicKey: string, poolAddress: string): Promise<number> {
    return storageManager.getNextDepositIndex(publicKey, poolAddress);
  }

  async updateLastUsedDepositIndex(publicKey: string, poolAddress: string, depositIndex: number): Promise<void> {
    return storageManager.updateLastUsedDepositIndex(publicKey, poolAddress, depositIndex);
  }
}