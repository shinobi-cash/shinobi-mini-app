/**
 * Reusable toast utilities for consistent transaction notifications
 */

import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import { NETWORK } from '../config/constants';

/**
 * Show a success toast with a clickable transaction link
 */
export function showTransactionSuccessToast(
  transactionHash: string,
  title: string = 'Transaction Successful',
  duration: number = 8000
) {
  toast.success(title, {
    description: (
      <div className="flex items-center gap-2">
        <span>Transaction confirmed</span>
        <a 
          href={`${NETWORK.EXPLORER_URL}/tx/${transactionHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline flex items-center gap-1"
        >
          View <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    ),
    duration,
  });
}

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