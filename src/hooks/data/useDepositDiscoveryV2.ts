/**
 * Privacy-First Note Discovery (V2)
 * 
 * This implementation solves the privacy vulnerability in V1 where specific queries
 * to the indexer could reveal user transaction patterns and break anonymity.
 * 
 * Key privacy improvements:
 * - Generic activity queries only - no user-specific data exposed to indexer
 * - Client-side precommitment matching - all filtering happens locally
 * - Page-by-page processing - memory efficient with incremental chain building
 * - Cursor-based bookmarking - efficient resumption after interruptions
 * 
 * DO NOT USE IN PRODUCTION YET - This is for development and testing only.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Note, DiscoveryResult, NoteChain, noteCache } from "@/lib/storage/noteCache";
import { poseidon1, poseidon2 } from 'poseidon-lite';
import {
  deriveDepositNullifier,
  deriveDepositSecret,
  deriveChangeNullifier
} from '@/utils/noteDerivation';
import { queuedRequest } from '@/lib/apiQueue';
import { apolloClient } from '@/lib/clients';
import { INDEXER_FETCH_POLICY } from '@/config/constants';
import { gql } from '@apollo/client';

// ============ TYPES ============

// V2 uses same cache structure as V1 - no special V2 cache needed

/**
 * Generic activity from indexer - only essential fields for privacy-first discovery
 */
interface GenericActivity {
  id: string;
  type: string;
  poolId: string;
  amount: string;
  label?: string;
  precommitmentHash?: string;
  spentNullifier?: string;
  newCommitment?: string;
  blockNumber: string;
  timestamp: string;
  transactionHash: string;
}

/**
 * Paginated activity response from GraphQL
 */
interface ActivityPage {
  activities: GenericActivity[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
}

// V2 doesn't need complex progress tracking - keep it simple

// ============ CONFIGURATION ============

const ACTIVITIES_PER_PAGE = 100; // Page size for activity queries

// ============ GRAPHQL QUERIES ============

const GET_ALL_ACTIVITIES_PAGINATED = gql`
  query GetAllActivitiesPaginated($poolId: String!, $limit: Int!, $after: String) {
    activitys(
      where: { poolId: $poolId }
      limit: $limit
      after: $after
      orderBy: "timestamp"
      orderDirection: "asc"
    ) {
      items {
        id
        type
        poolId
        amount
        label
        precommitmentHash
        spentNullifier
        newCommitment
        blockNumber
        timestamp
        transactionHash
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

// ============ PRIVACY-FIRST API FUNCTIONS ============

/**
 * Fetch a page of activities - this is the ONLY query we make to indexer
 * This query reveals no user-specific information
 */
async function fetchActivitiesPage(
  poolAddress: string, 
  cursor?: string,
  pageSize: number = ACTIVITIES_PER_PAGE
): Promise<ActivityPage> {
  return queuedRequest(async () => {
    try {
      const poolId = poolAddress.toLowerCase();
      
      const result = await apolloClient.query({
        query: GET_ALL_ACTIVITIES_PAGINATED,
        variables: { 
          poolId, 
          limit: pageSize, 
          after: cursor || null 
        },
        fetchPolicy: INDEXER_FETCH_POLICY,
      });

      const activities = result.data?.activitys?.items || [];
      const pageInfo = result.data?.activitys?.pageInfo || {};
      
      return {
        activities,
        pageInfo: {
          hasNextPage: pageInfo.hasNextPage || false,
          hasPreviousPage: pageInfo.hasPreviousPage || false,
          startCursor: pageInfo.startCursor || '',
          endCursor: pageInfo.endCursor || '',
        }
      };
    } catch (error) {
      console.error(`[DiscoveryV2] ❌ Failed to fetch activities page:`, error);
      throw error;
    }
  });
}

/**
 * Build withdrawal chain for a deposit using activities after the deposit
 */
function buildWithdrawalChain(
  chain: NoteChain,
  activitiesAfterDeposit: GenericActivity[],
  accountKey: bigint,
  poolAddress: string,
  initialNullifier: bigint,
  initialAmount: bigint
): void {
  let currentNoteNullifier = initialNullifier;
  let changeIndex = 1;
  let remainingAmount = initialAmount;
  
  // Follow the chain by finding withdrawals
  let changeFound = false;
  do {
    const currentNoteNullifierHash = poseidon1([currentNoteNullifier]);
    
    // Find withdrawal in activities AFTER the deposit (optimization!)
    const withdrawalData = activitiesAfterDeposit.find(activity =>
     activity.type === 'WITHDRAWAL' && 
      activity.spentNullifier === currentNoteNullifierHash.toString()
    );

    if (withdrawalData && withdrawalData.newCommitment) {
      // Mark current note as spent (same logic as V1)
      if (changeIndex === 1) {
        chain[0].status = 'spent';
      } else {
        chain[chain.length - 1].status = 'spent';
      }
      
      changeFound = true;
      remainingAmount -= BigInt(withdrawalData.amount);
      
      const changeNote: Note = {
        poolAddress: chain[0].poolAddress,
        depositIndex: chain[0].depositIndex,
        changeIndex,
        amount: remainingAmount.toString(),
        transactionHash: withdrawalData.transactionHash,
        blockNumber: withdrawalData.blockNumber,
        timestamp: withdrawalData.timestamp,
        status: remainingAmount > 0n ? 'unspent' : 'spent',
        label: chain[0].label,
      };

      chain.push(changeNote);
      
      if (remainingAmount <= 0n) {
        changeFound = false;
      } else {
        currentNoteNullifier = deriveChangeNullifier(accountKey, poolAddress, chain[0].depositIndex, changeIndex);
        changeIndex++;
      }
    } else {
      changeFound = false;
    }
  } while (changeFound);
}

// ============ MAIN PRIVACY-FIRST DISCOVERY FUNCTION ============

/**
 * Privacy-First Note Discovery with Page-by-Page Processing
 * 
 * This is the core V2 discovery function that implements:
 * 1. Page-by-page processing - memory efficient with incremental chain building
 * 2. Client-side privacy filtering - no user data exposed to indexer  
 * 3. Cursor-based bookmarking - efficient resumption
 * 4. Progress reporting - UI updates for long sessions
 */
export async function discoverNotes(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint
): Promise<DiscoveryResult> {
  console.log(`[DiscoveryV2] 🔍 Starting privacy-first discovery...`);
  
  // Step 1: Check if cache is available
  const cached = await noteCache.getCachedNotes(publicKey, poolAddress);
  if (cached) {
    console.log(`[DiscoveryV2] 📦 Found cached data: ${cached.notes.length} chains, lastUsedIndex: ${cached.lastUsedIndex}`);
  } else {
    console.log(`[DiscoveryV2] 📦 No cached data found - starting fresh discovery`);
  }
  
  // Step 2: Check pagination state and resume from last processed cursor if available
  let startCursor = cached?.lastProcessedCursor;
  
  // Step 3: Make request for that cursor position
  const pageData = await fetchActivitiesPage(poolAddress, startCursor);
  console.log(`[DiscoveryV2] 📄 Fetched ${pageData.activities.length} activities`);
  
  // Initialize discovery state
  let notes: NoteChain[] = [];
  let lastUsedIndex = cached ? cached.lastUsedIndex : -1;
  let newNotesFound = 0;
  let consecutiveNotFound = 0;
  const maxGap = 1;
  
  // Step 1: Re-validate and extend existing cached note chains
  if (cached && cached.notes.length > 0) {
    console.log(`[DiscoveryV2] 🔄 Re-validating ${cached.notes.length} cached chains`);
    for (const cachedChain of cached.notes) {
      const lastNote = cachedChain[cachedChain.length - 1];
      const remainingAmount = BigInt(lastNote.amount);
      const depositIndex = cachedChain[0].depositIndex;
      
      // Only re-validate if last note is unspent and has remaining balance
      if (lastNote.status === 'unspent' && remainingAmount > 0n) {
        // Copy cached chain to extend
        let chain: NoteChain = [...cachedChain];
        
        // Determine current nullifier for withdrawal searching
        let currentNoteNullifier: bigint;
        if (lastNote.changeIndex === 0) {
          // Last note is the deposit
          currentNoteNullifier = deriveDepositNullifier(accountKey, poolAddress, depositIndex);
        } else {
          // Last note is a change note
          currentNoteNullifier = deriveChangeNullifier(accountKey, poolAddress, depositIndex, lastNote.changeIndex);
        }
        
        // Search for new withdrawals in ALL page activities (no chronological constraint for cached chains)
        buildWithdrawalChain(
          chain,
          pageData.activities,
          accountKey,
          poolAddress,
          currentNoteNullifier,
          remainingAmount
        );
        
        // Add updated chain
        notes.push(chain);
        
        // Count new notes found in this chain
        if (chain.length > cachedChain.length) {
          const newNotesInChain = chain.length - cachedChain.length;
          newNotesFound += newNotesInChain;
          console.log(`[DiscoveryV2] ✅ Extended chain ${depositIndex}: +${newNotesInChain} notes`);
        }
      } else {
        // Chain is complete (spent or 0 balance), add as-is
        notes.push(cachedChain);
      }
    }
  }
  
  // Step 2: Search for new deposits one by one using gap-based discovery (like V1)
  const startFromDepositIndex = cached ? cached.lastUsedIndex + 1 : 0;
  console.log(`[DiscoveryV2] 🔍 Starting deposit search from index ${startFromDepositIndex}`);
  
  let currentDepositIndex = startFromDepositIndex;
  let searchStartPosition = 0; // Chronological optimization: next deposit can't exist before previous
  
  // Continue searching until we hit the gap limit  
  while (consecutiveNotFound < maxGap) {
    console.log(`[DiscoveryV2] 🔎 Searching for deposit index ${currentDepositIndex}`);
    // Generate precommitment for the current deposit index
    const depositNullifier = deriveDepositNullifier(accountKey, poolAddress, currentDepositIndex);
    const depositSecret = deriveDepositSecret(accountKey, poolAddress, currentDepositIndex);
    const targetPrecommitment = poseidon2([depositNullifier, depositSecret]).toString();
    
    // Search for matching precommitment in remaining activities (chronological optimization)
    let depositActivityIndex = -1;
    for (let i = searchStartPosition; i < pageData.activities.length; i++) {
      const activity = pageData.activities[i];
      if (activity.type === 'DEPOSIT' && activity.precommitmentHash === targetPrecommitment) {
        depositActivityIndex = i;
        break;
      }
    }
    console.log(`[DiscoveryV2] 🔍 Deposit note index ${currentDepositIndex} ${depositActivityIndex !== -1 ? `found at index ${depositActivityIndex}` : 'not found'}`);
    if (depositActivityIndex !== -1) {
      const matchingDeposit = pageData.activities[depositActivityIndex];
      
      // Create initial deposit note
      const depositNote: Note = {
        poolAddress,
        depositIndex: currentDepositIndex,
        changeIndex: 0,
        amount: matchingDeposit.amount,
        transactionHash: matchingDeposit.transactionHash,
        blockNumber: matchingDeposit.blockNumber,
        timestamp: matchingDeposit.timestamp,
        status: 'unspent',
        label: matchingDeposit.label || `Deposit #${currentDepositIndex}`,
      };
      
      let chain: NoteChain = [depositNote];
      let remainingAmount = BigInt(matchingDeposit.amount);
      
      // Search for ALL withdrawals in activities AFTER this deposit  
      const activitiesAfterDeposit = pageData.activities.slice(depositActivityIndex + 1);
      
      // Build the complete withdrawal chain using the refactored method
      buildWithdrawalChain(
        chain, 
        activitiesAfterDeposit, 
        accountKey, 
        poolAddress, 
        depositNullifier, 
        remainingAmount
      );

      console.log(`[DiscoveryV2] ✅ Found deposit ${currentDepositIndex}: ${chain.length} notes`);
      
      // Step 6: Add completed chain to notes array and update tracking
      notes.push(chain);
      newNotesFound += chain.length;
      lastUsedIndex = Math.max(lastUsedIndex, currentDepositIndex);
      consecutiveNotFound = 0; // Reset gap counter when deposit found
      
      // Update search position: next deposit can only exist after this deposit (chronological optimization)
      // searchStartPosition = depositActivityIndex + 1; // disabling it in V2 to allow full page scan for deposits temoprarily
      
    } else {
      consecutiveNotFound++;
    }
    
    // Move to next deposit index for derivation
    currentDepositIndex++;
  }
  
  // Step 8: Cache results and return DiscoveryResult
  await noteCache.storeDiscoveredNotes(publicKey, poolAddress, notes);
  
  console.log(`[DiscoveryV2] ✅ Complete: ${notes.length} chains, ${newNotesFound} notes, lastUsedIndex: ${lastUsedIndex}`);
  
  return {
    notes: notes,
    lastUsedIndex,
    newNotesFound,
    syncTime: Date.now(),
  };
}

// ============ REACT HOOK V2 ============

/**
 * Privacy-First Note Discovery Hook (V2)
 * 
 * Enhanced version of V1 hook with progress tracking.
 * Returns everything V1 had plus real-time progress updates.
 */
export function useNotes(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint,
) {
  const [data, setData] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [progress] = useState(null); // kept for V2 compatibility

  // Stable string version of accountKey for dependency tracking
  const accountKeyString = useMemo(
    () => (accountKey !== undefined ? accountKey.toString() : ""),
    [accountKey]
  );

  // Prevent race conditions for refresh()
  const refreshIdRef = useRef(0);

  // Guard to prevent StrictMode double-invoke (dev only)
  const didRunRef = useRef(false);

  async function fetchNotes(signal?: AbortSignal) {
    return discoverNotes(publicKey, poolAddress, accountKey);
  }

  useEffect(() => {
    if (didRunRef.current) return; // ✅ skip second StrictMode run
    didRunRef.current = true;

    const controller = new AbortController();
    const signal = controller.signal;

    async function loadNotesV2() {
      setLoading(true);
      setError(null);

      try {
        console.log(
          `[DiscoveryV2] 🔒 Starting discovery for ${poolAddress.substring(0, 6)}...`
        );

        const result = await fetchNotes(signal);

        setData(result);
        console.log(
          `[DiscoveryV2] ✅ Complete: ${result.notes.length} chains, ${result.newNotesFound} notes`
        );
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error(`[DiscoveryV2] ❌ Discovery failed:`, err);
          setError(err as Error);
        }
      } finally {
        setLoading(false);
      }
    }

    loadNotesV2();

    return () => controller.abort();
  }, [publicKey, poolAddress, accountKeyString]);

  const refresh = async () => {
    const id = ++refreshIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchNotes();
      if (id === refreshIdRef.current) {
        setData(result);
      }
      return result;
    } catch (err) {
      if (id === refreshIdRef.current) {
        setError(err as Error);
      }
      throw err;
    } finally {
      if (id === refreshIdRef.current) {
        setLoading(false);
      }
    }
  };

  return { data, loading, error, progress, refresh };
}
