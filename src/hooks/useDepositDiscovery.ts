/**
 * Hook for discovering user deposits from the indexer
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { noteCache, DiscoveredNote } from '../lib/noteCache';
import { fetchDepositByPrecommitment, isNullifierSpent } from '../lib/apollo';
import { deriveNullifier, deriveSecret, generatePrecommitment } from './useDepositCommitment';
import { restoreFromMnemonic } from '../utils/crypto';
import { formatEther } from 'viem';
import { poseidon1 } from 'poseidon-lite';
import { CONTRACTS } from '@/config/constants';

export interface DepositDiscoveryState {
  unspentNotes: DiscoveredNote[];
  totalNotes: number;
  isDiscovering: boolean;
  error: string | null;
  lastDiscoveryTime: Date | null;
  newNotesFound: number;
}

export interface UseDepositDiscoveryResult extends DepositDiscoveryState {
  discoverNotes: (forceRefresh?: boolean) => Promise<void>;
  refreshNotes: () => Promise<void>;
}

/**
 * Hook to discover user deposits from the indexer
 * Handles discovery logic and caching
 */
export function useDepositDiscovery(): UseDepositDiscoveryResult {
  const { mnemonic, privateKey } = useAuth();
  
  const [state, setState] = useState<DepositDiscoveryState>({
    unspentNotes: [],
    totalNotes: 0,
    isDiscovering: false,
    error: null,
    lastDiscoveryTime: null,
    newNotesFound: 0,
  });

  /**
   * Core discovery logic - generates precommitments and checks blockchain
   */
  const performNoteDiscovery = useCallback(async (accountKey: string, poolAddress: string): Promise<DiscoveredNote[]> => {
    const discoveredNotes: DiscoveredNote[] = [];
    let noteIndex = 0;
    const maxSearchIndex = 1000;

    while (noteIndex < maxSearchIndex) {
      try {
        // Generate cryptographic values for this note index
        const nullifier = deriveNullifier(accountKey, poolAddress, noteIndex);
        const secret = deriveSecret(accountKey, poolAddress, noteIndex);
        const precommitmentHash = generatePrecommitment(nullifier, secret);
        const nullifierHash = poseidon1([nullifier]).toString();

        // Check deposit existence and spent status in parallel
        const [depositActivity, isSpent] = await Promise.all([
          fetchDepositByPrecommitment(precommitmentHash),
          isNullifierSpent(nullifierHash)
        ]);
        
        if (!depositActivity) {
          break; // No more deposits found - end discovery
        }

        // Create discovered note with proper status
        const amount = depositActivity.amount || '0';
        const status = isSpent ? 'spent' : 'unspent';
        
        discoveredNotes.push({
          noteIndex,
          amount: formatEther(BigInt(amount)),
          transactionHash: depositActivity.transactionHash || 'unknown',
          blockNumber: depositActivity.blockNumber || 'unknown',
          timestamp: depositActivity.timestamp || Date.now().toString(),
          status,
          precommitmentHash: depositActivity.precommitmentHash,
          commitment: depositActivity.commitment,
          label: depositActivity.label,
          discoveredAt: Date.now(),
        });

        noteIndex++;
      } catch (error) {
        console.error(`Error discovering note at index ${noteIndex}:`, error);
        noteIndex++;
      }
    }

    return discoveredNotes;
  }, []);

  /**
   * Discover notes with caching support
   */
  const discoverNotes = useCallback(async (forceRefresh = false) => {
    if (!mnemonic && !privateKey) return;

    const accountKey = getAccountKey(mnemonic || undefined, privateKey || undefined);
    if (!accountKey) {
      setState(prev => ({ ...prev, error: 'Failed to get account key' }));
      return;
    }

    setState(prev => ({ ...prev, isDiscovering: true, error: null }));

    try {
      const poolAddress = CONTRACTS.ETH_PRIVACY_POOL;

      // Check cache first
      if (!forceRefresh) {
        const cachedResult = await noteCache.getCachedNotes(accountKey, poolAddress);
        if (cachedResult) {
          const unspentNotes = cachedResult.notes.filter(note => note.status === 'unspent');
          setState(prev => ({
            ...prev,
            unspentNotes,
            totalNotes: cachedResult.notes.length,
            newNotesFound: 0,
            isDiscovering: false,
            lastDiscoveryTime: new Date(cachedResult.syncTime),
          }));
          return;
        }
      }

      // Perform fresh discovery
      const discoveredNotes = await performNoteDiscovery(accountKey, poolAddress);
      
      // Cache the results
      await noteCache.storeDiscoveredNotes(accountKey, poolAddress, discoveredNotes);

      // Update state with unspent notes only
      const unspentNotes = discoveredNotes.filter(note => note.status === 'unspent');
      setState(prev => ({
        ...prev,
        unspentNotes,
        totalNotes: discoveredNotes.length,
        newNotesFound: discoveredNotes.length,
        isDiscovering: false,
        lastDiscoveryTime: new Date(),
      }));

    } catch (error) {
      console.error('Failed to discover notes:', error);
      setState(prev => ({
        ...prev,
        isDiscovering: false,
        error: error instanceof Error ? error.message : 'Failed to discover notes',
      }));
    }
  }, [mnemonic, privateKey, performNoteDiscovery]);

  /**
   * Force refresh from blockchain
   */
  const refreshNotes = useCallback(() => discoverNotes(true), [discoverNotes]);

  /**
   * Auto-discover on authentication
   */
  useEffect(() => {
    if (mnemonic || privateKey) {
      discoverNotes();
    }
  }, [mnemonic, privateKey, discoverNotes]);

  return {
    ...state,
    discoverNotes,
    refreshNotes,
  };
}


/**
 * Get account key from mnemonic or private key
 */
function getAccountKey(mnemonic?: string[], privateKey?: string): string | null {
  if (privateKey) {
    return privateKey;
  } else if (mnemonic) {
    try {
      const restoredKeys = restoreFromMnemonic(mnemonic);
      return restoredKeys.privateKey;
    } catch (error) {
      console.error('Failed to restore private key from mnemonic:', error);
      return null;
    }
  }
  return null;
}