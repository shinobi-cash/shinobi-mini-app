/**
 * Deposit Storage Provider Interface
 * Abstracts storage operations for deposit service
 */

export interface IDepositStorageProvider {
  /**
   * Get next deposit index for new deposits
   */
  getNextDepositIndex(publicKey: string, poolAddress: string): Promise<number>;

  /**
   * Update last used deposit index after successful deposit
   */
  updateLastUsedDepositIndex(publicKey: string, poolAddress: string, depositIndex: number): Promise<void>;
}