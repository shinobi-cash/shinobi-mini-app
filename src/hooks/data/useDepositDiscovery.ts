// hooks/useNotes.ts
import { Note, DiscoveryResult, NoteChain, noteCache } from "@/lib/storage/noteCache";
import { useState, useEffect } from 'react';
import { poseidon1, poseidon2 } from 'poseidon-lite';
import {
  deriveDepositNullifier,
  deriveDepositSecret,
  deriveChangeNullifier
} from '@/utils/noteDerivation';
import { fetchDepositByPrecommitment, fetchWithdrawalBySpentNullifier } from "@/services/data/queryService";

/**
 * Discover a single deposit chain by deposit index with optional cached data optimization
 */
async function discoverSingleDepositChain(
  accountKey: bigint,
  poolAddress: string,
  depositIndex: number,
  cachedChain?: NoteChain
): Promise<NoteChain | null> {
  const depositNullifier = deriveDepositNullifier(accountKey, poolAddress, depositIndex);
  const depositSecret = deriveDepositSecret(accountKey, poolAddress, depositIndex);
  const precommitment = poseidon2([depositNullifier, depositSecret]);

  if (cachedChain) {
    console.log(`[Discovery] 📋 Using cached chain for deposit ${depositIndex} with ${cachedChain.length} notes`);
  } else {
    console.log(`[Discovery] 🆕 Fresh discovery for deposit index ${depositIndex}`);
  }

  try {
    // Start with cached chain if available, otherwise create new deposit note
    let chain: NoteChain;
    let changeIndex: number;
    let remainingAmount: bigint;
    let currentNoteNullifier: bigint;

    if (cachedChain && cachedChain.length > 0) {
      // Use cached data and continue from the last unspent note
      chain = [...cachedChain]; // Copy cached chain
      
      // Find the last note in the chain (should be unspent)
      const lastNote = chain[chain.length - 1];
      changeIndex = lastNote.changeIndex + 1;
      remainingAmount = BigInt(lastNote.amount);
      
      console.log(`[Discovery] 📋 Last cached note: changeIndex=${lastNote.changeIndex}, amount=${lastNote.amount}, status=${lastNote.status}`);
      
      // Check if the last cached note has 0 balance and should be marked as spent
      if (remainingAmount <= 0n && lastNote.status === 'unspent') {
        lastNote.status = 'spent';
        console.log(`[Discovery] ✅ Marked zero-balance note as spent - chain complete`);
        return chain; // Chain is complete
      }
      
      // Only check if the last cached note is actually still unspent and has balance
      if (lastNote.status === 'unspent' && remainingAmount > 0n) {
        console.log(`[Discovery] 🔍 Continuing from unspent note - checking for new withdrawals`);
        if (lastNote.changeIndex === 0) {
          // Last note is the deposit
          currentNoteNullifier = depositNullifier;
        } else {
          // Last note is a change note
          currentNoteNullifier = deriveChangeNullifier(accountKey, poolAddress, depositIndex, lastNote.changeIndex);
        }
      } else {
        // All cached notes are spent or have 0 balance, chain is complete
        console.log(`[Discovery] ✅ Cached chain is complete - no API calls needed`);
        return chain;
      }
    } else {
      // No cache - start fresh, need to fetch deposit data
      const depositData = await fetchDepositByPrecommitment(precommitment.toString());

      if (!depositData) {
        return null;
      }

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

      chain = [depositNote];
      currentNoteNullifier = depositNullifier;
      changeIndex = 1;
      remainingAmount = BigInt(depositData.amount);
    }

    // Continue discovering from where we left off
    let changeFound = false;
    
    do {
      const currentNoteNullifierHash = poseidon1([currentNoteNullifier]);
      const withdrawalData = await fetchWithdrawalBySpentNullifier(currentNoteNullifierHash.toString());

      if (withdrawalData && withdrawalData.newCommitment) {
        // Mark the current note in the chain as spent
        if (changeIndex === 1) {
          // First change note - mark the deposit as spent
          chain[0].status = 'spent';
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
          status: remainingAmount > 0n ? 'unspent' : 'spent', // Mark as spent if 0 balance
          label: chain[0].label,
        };

        chain.push(changeNote);
        
        // If remaining amount is 0, this note is fully spent - stop here
        if (remainingAmount <= 0n) {
          changeFound = false;
        } else {
          currentNoteNullifier = deriveChangeNullifier(accountKey, poolAddress, depositIndex, changeIndex);
          changeIndex++;
        }
      } else {
        // No new change note found, so the current note (last in chain) remains unspent
        changeFound = false;
      }
    } while (changeFound);

    return chain;
  } catch (error) {
    console.warn(`Failed to check deposit at index ${depositIndex}:`, error);
    return null;
  }
}

/**
 * Main discovery function to find, update, and organize all notes for an account in a single pass.
 */
export async function discoverNotes(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint
): Promise<DiscoveryResult> {
  console.log(`\n[Discovery] 🔍 Starting note discovery for pool ${poolAddress.substring(0, 10)}...`);
  const cached = await noteCache.getCachedNotes(publicKey, poolAddress);
  
  if (cached) {
    console.log(`[Discovery] 📦 Found cached data: ${cached.notes.length} note chains, lastUsedIndex: ${cached.lastUsedIndex}`);
  } else {
    console.log(`[Discovery] 📦 No cached data found - starting fresh discovery`);
  }
  
  let notes: NoteChain[] = [];
  let lastUsedIndex = cached ? cached.lastUsedIndex : -1;
  let newNotesFound = 0;

  // Step 1: Re-validate and extend existing cached note chains
  if (cached && cached.notes.length > 0) {
    console.log(`[Discovery] 🔄 Step 1: Re-validating ${cached.notes.length} cached note chains`);
    for (const cachedChain of cached.notes) {
      const depositIndex = cachedChain[0].depositIndex;
      console.log(`[Discovery] 🔍 Checking cached chain for deposit index ${depositIndex} (${cachedChain.length} notes)`);
      
      // Optimize: pass cached chain to avoid re-fetching spent notes
      const chain = await discoverSingleDepositChain(accountKey, poolAddress, depositIndex, cachedChain);
      if (chain) {
        notes.push(chain);
        // Count new notes found in this chain
        if (chain.length > cachedChain.length) {
          const newNotesInChain = chain.length - cachedChain.length;
          newNotesFound += newNotesInChain;
          console.log(`[Discovery] ✅ Found ${newNotesInChain} new notes in existing chain ${depositIndex}`);
        } else {
          console.log(`[Discovery] ✅ Chain ${depositIndex} unchanged (${chain.length} notes)`);
        }
      }
    }
  } else {
    console.log(`[Discovery] 🔄 Step 1: Skipped - no cached chains to re-validate`);
  }

  // Step 2: Search for completely new deposits starting from last known index
  const startDepositIndex = cached ? cached.lastUsedIndex + 1 : 0;
  console.log(`[Discovery] 🔄 Step 2: Searching for new deposits starting from index ${startDepositIndex}`);
  let consecutiveNotFound = 0;
  const maxGap = 1;
  let depositIndex = startDepositIndex;
  while (consecutiveNotFound < maxGap) {
    console.log(`[Discovery] 🔍 Checking deposit index ${depositIndex} (gap: ${consecutiveNotFound}/${maxGap})`);
    const chain = await discoverSingleDepositChain(accountKey, poolAddress, depositIndex);
    
    if (chain) {
      notes.push(chain);
      newNotesFound += chain.length;
      lastUsedIndex = Math.max(lastUsedIndex, depositIndex);
      consecutiveNotFound = 0;
      console.log(`[Discovery] ✅ Found new deposit chain at index ${depositIndex} with ${chain.length} notes`);
    } else {
      consecutiveNotFound++;
      console.log(`[Discovery] ❌ No deposit found at index ${depositIndex}`);
    }
    
    depositIndex++;
  }

  await noteCache.storeDiscoveredNotes(publicKey, poolAddress, notes);

  console.log(`[Discovery] ✅ Discovery complete! Total chains: ${notes.length}, New notes found: ${newNotesFound}, Last used index: ${lastUsedIndex}`);
  console.log(`[Discovery] 💾 Cache updated with ${notes.length} note chains\n`);

  return {
    notes: notes,
    lastUsedIndex,
    newNotesFound,
  };
}

export function useNotes(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint,
) {
  const [data, setData] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    
    async function loadNotes() {
      setLoading(true);
      setError(null);
      
      try {
        // Run incremental discovery - it uses cache data internally and only fetches new notes
        const result = await discoverNotes(publicKey, poolAddress, accountKey);
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    
    loadNotes();
    
    return () => {
      mounted = false;
    };
  }, [publicKey, poolAddress, accountKey?.toString()]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await discoverNotes(publicKey, poolAddress, accountKey);
      setData(result);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refresh };
}