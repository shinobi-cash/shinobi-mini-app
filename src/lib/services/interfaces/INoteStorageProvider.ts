/**
 * Note Storage Provider Interface
 * Abstracts storage operations for note discovery service
 */

import type { DiscoveryResult, NoteChain } from "@/lib/storage/interfaces/IDataTypes";

export interface INoteStorageProvider {
  /**
   * Get cached notes for discovery resumption
   */
  getCachedNotes(publicKey: string, poolAddress: string): Promise<DiscoveryResult | null>;

  /**
   * Store discovered notes with pagination cursor
   */
  storeDiscoveredNotes(
    publicKey: string, 
    poolAddress: string, 
    notes: NoteChain[], 
    lastProcessedCursor?: string
  ): Promise<void>;

  /**
   * Get next deposit index for new deposits
   */
  getNextDepositIndex(publicKey: string, poolAddress: string): Promise<number>;

  /**
   * Update last used deposit index
   */
  updateLastUsedDepositIndex(publicKey: string, poolAddress: string, depositIndex: number): Promise<void>;
}