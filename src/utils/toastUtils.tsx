/**
 * Reusable transaction utilities
 */

import { NETWORK } from '../config/constants';

/**
 * Show a formatted transaction hash with copy functionality
 */
export function formatTransactionHash(hash: string, length: number = 10): string {
  if (hash.length <= length) return hash;
  const start = Math.floor((length - 3) / 2);
  const end = length - 3 - start;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

/**
 * Generate explorer URL for transaction
 */
export function getTransactionExplorerUrl(transactionHash: string): string {
  return `${NETWORK.EXPLORER_URL}/tx/${transactionHash}`;
}