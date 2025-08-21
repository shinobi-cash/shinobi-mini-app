// hooks/useNotes.ts
import { Note, DiscoveryResult, NoteChain, noteCache } from '@/lib/noteCache';
import { useState, useEffect } from 'react';
import { poseidon1, poseidon2 } from 'poseidon-lite';
import {
  deriveDepositNullifier,
  deriveDepositSecret,
  deriveChangeNullifier
} from '@/utils/noteDerivation';
import { fetchDepositByPrecommitment, fetchWithdrawalBySpentNullifier } from '@/services/queryService';

/**
 * Main discovery function to find, update, and organize all notes for an account in a single pass.
 */
export async function discoverNotes(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint
): Promise<DiscoveryResult> {
  const cached = await noteCache.getCachedNotes(publicKey, poolAddress);
  const startDepositIndex = cached ? cached.lastUsedIndex + 1 : 0;

  const notes: NoteChain[] = cached ? cached.notes : [];
  let lastUsedIndex = cached ? cached.lastUsedIndex : -1;
  let newNotesFound = 0;

  let consecutiveNotFound = 0;
  const maxGap = 2; // Use a reasonable gap to stop searching for deposits

  // Single pass to discover deposits and their change notes
  let depositIndex = startDepositIndex;
  while (consecutiveNotFound < maxGap) {
    console.log(`Checking deposit at index ${depositIndex}...`);
    const depositNullifier = deriveDepositNullifier(accountKey, poolAddress, depositIndex);
    const depositSecret = deriveDepositSecret(accountKey, poolAddress, depositIndex);
    const precommitment = poseidon2([depositNullifier, depositSecret]);

    try {
      const depositData = await fetchDepositByPrecommitment(precommitment.toString());

      if (depositData) {
        let depositNote: Note = {
          poolAddress,
          depositIndex,
          changeIndex: 0,
          amount: depositData.amount,
          transactionHash: depositData.transactionHash,
          blockNumber: depositData.blockNumber,
          timestamp: depositData.timestamp,
          status: 'unspent',
          label: depositData.label!,
        };

        const chain: NoteChain = [depositNote];
        let currentNoteNullifier = depositNullifier;

        let changeIndex = 1;
        let changeFound = false;
        let remainingAmount =  BigInt(depositData.amount)
        do {
          const currentNoteNullifierHash = poseidon1([currentNoteNullifier]);
          const withdrawalData = await fetchWithdrawalBySpentNullifier(currentNoteNullifierHash.toString());

          if (withdrawalData && withdrawalData.newCommitment) {
            // Mark the current note in the chain as spent
            if (changeIndex === 1) {
              // First change note - mark the deposit as spent
              depositNote.status = 'spent';
            } else {
              // Subsequent change notes - mark the previous change note as spent
              chain[chain.length - 1].status = 'spent';
            }
            
            changeFound = true;
            
            // Calculate remaining amount after this withdrawal
            remainingAmount -= BigInt(withdrawalData.amount);
            const changeNote: Note = {
              poolAddress,
              depositIndex,
              changeIndex,
              amount: remainingAmount.toString(),
              transactionHash: withdrawalData.transactionHash,
              blockNumber: withdrawalData.blockNumber,
              timestamp: withdrawalData.timestamp,
              status: 'unspent', // This will be marked spent if further changes are found
              label: depositNote.label,
            };

            chain.push(changeNote);
            currentNoteNullifier = deriveChangeNullifier(accountKey, poolAddress, depositIndex, changeIndex);
            changeIndex++;
          } else {
            // No new change note found, so the current note (last in chain) remains unspent
            changeFound = false;
          }
        } while (changeFound);

        notes.push(chain);
        newNotesFound += chain.length;
        lastUsedIndex = Math.max(lastUsedIndex, depositIndex);
        consecutiveNotFound = 0;
      } else {
        consecutiveNotFound++;
      }
    } catch (error) {
      console.warn(`Failed to check deposit at index ${depositIndex}:`, error);
      consecutiveNotFound++;
    }
    depositIndex++;
  }

  await noteCache.storeDiscoveredNotes(publicKey, poolAddress, notes);

  return {
    notes: notes,
    lastUsedIndex,
    newNotesFound,
    syncTime: Date.now(),
  };
}

// NOTE: The `discoverDeposits` and `discoverWithdrawalChanges` helper functions are no longer needed,
// as their logic is now integrated into the main `discoverNotes` function.

export function useNotes(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint
) {
  const [data, setData] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    async function runDiscovery() {
      setLoading(true);
      setError(null);
      try {
        const result = await discoverNotes(publicKey, poolAddress, accountKey);
        if (mounted) setData(result);
      } catch (err) {
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    runDiscovery();
    return () => {
      mounted = false;
    };
  }, [publicKey, poolAddress, accountKey]);

  return { data, loading, error };
}