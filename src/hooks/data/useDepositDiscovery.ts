// discoverNotesV2.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Note, DiscoveryResult, NoteChain, noteCache } from "@/lib/storage/noteCache";
import { poseidon1, poseidon2 } from "poseidon-lite";
import {
  deriveDepositNullifier,
  deriveDepositSecret,
  deriveChangeNullifier,
} from "@/utils/noteDerivation";
import { queuedRequest } from "@/lib/apiQueue";
import { apolloClient } from "@/lib/clients";
import { INDEXER_FETCH_POLICY } from "@/config/constants";
import { GET_ALL_ACTIVITIES_PAGINATED } from "@/config/queries";
import type { Activity } from '@/services/data'

/* ---------- Configuration ---------- */
const ACTIVITIES_PER_PAGE = 100;


interface ActivityPage {
  activities: Activity[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
}

export type DiscoveryProgress = {
  pagesProcessed: number;
  currentPageActivityCount: number;
  depositsChecked: number;   // derived deposit indices checked
  depositsMatched: number;   // deposit indices that matched (new deposits discovered)
  lastCursor?: string;
  complete: boolean;
};

/* ---------- Helpers: fetch a single page (uses queuedRequest) ---------- */
/**
 * Fetch one page of activities for the pool.
 * The queuedRequest wrapper is used to rate-limit calls.
 * The executor closure is where we can check signal early.
 */
async function fetchActivitiesPage(
  poolAddress: string,
  cursor?: string,
  pageSize: number = ACTIVITIES_PER_PAGE,
  opts?: { signal?: AbortSignal }
): Promise<ActivityPage> {
  return queuedRequest(async () => {
    // Respect AbortSignal early to avoid unnecessary request scheduling
    if (opts?.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const poolId = poolAddress.toLowerCase();
    const result = await apolloClient.query({
      query: GET_ALL_ACTIVITIES_PAGINATED,
      variables: { poolId, limit: pageSize, after: cursor || null },
      fetchPolicy: INDEXER_FETCH_POLICY,
    });

    const activities = result.data?.activitys?.items || [];
    const pageInfo = result.data?.activitys?.pageInfo || {};

    return {
      activities,
      pageInfo: {
        hasNextPage: !!pageInfo.hasNextPage,
        hasPreviousPage: !!pageInfo.hasPreviousPage,
        startCursor: pageInfo.startCursor || "",
        endCursor: pageInfo.endCursor || "",
      },
    };
  });
}

/* ---------- Helper: extend an existing chain IN-PLACE using activities from a page ----------
   - Mutates the provided `chain` (pushes change notes).
   - Forward-only logic: we only search for spending nullifier(s) after we know the deposit.
*/
function extendChainInPlace(
  chain: NoteChain,
  pageActivities: Activity[],
  accountKey: bigint,
  poolAddress: string
): number {
  // Start from the last note in the chain
  let withdrawalsMatched = 0;

  // Compute remaining amount and changeIndex starting point based on last note
  let lastNote = chain[chain.length - 1];
  let remaining = BigInt(lastNote.amount);
  let changeIndex = lastNote.changeIndex === 0 ? 1 : lastNote.changeIndex + 1;

  // Derive current nullifier for the last note (deposit or change)
  let currentNullifier: bigint;
  if (lastNote.changeIndex === 0) {
    currentNullifier = deriveDepositNullifier(accountKey, poolAddress, chain[0].depositIndex);
  } else {
    currentNullifier = deriveChangeNullifier(
      accountKey,
      poolAddress,
      chain[0].depositIndex,
      lastNote.changeIndex
    );
  }

  // Repeatedly try to find a withdrawal that spends the current nullifier in this page.
  // Stop when not found or remaining becomes 0.
  while (true) {
    const nullifierHash = poseidon1([currentNullifier]).toString();

    // Find withdrawal in this page that spends this nullifier.
    // Use find() so we only match the earliest relevant withdrawal in this page.
    const w = pageActivities.find((a) => a.type === "WITHDRAWAL" && a.spentNullifier === nullifierHash);

    if (!w || !w.newCommitment) {
      // No matching withdrawal found in this page for the current nullifier
      break;
    }

    // Mark previous note as spent
    chain[chain.length - 1].status = "spent";

    // Subtract amount and create a change note if remaining > 0
    remaining -= BigInt(w.amount);

    const changeNote: Note = {
      poolAddress: chain[0].poolAddress,
      depositIndex: chain[0].depositIndex,
      changeIndex,
      amount: remaining.toString(),
      transactionHash: w.transactionHash,
      blockNumber: w.blockNumber,
      timestamp: w.timestamp,
      status: remaining > 0n ? "unspent" : "spent",
      label: chain[0].label,
    };

    // Append change note in-place
    chain.push(changeNote);
    withdrawalsMatched++;

    // If fully spent, stop following
    if (remaining <= 0n) break;

    // Otherwise advance to next change nullifier
    currentNullifier = deriveChangeNullifier(accountKey, poolAddress, chain[0].depositIndex, changeIndex);
    changeIndex++;
  }

  return withdrawalsMatched;
}

/* ---------- Helper: build new chain for deposit that appears in this page ----------
   - Creates initial deposit note and tries to extend it using activities after deposit in the same page.
   - Returns the chain and how many withdrawals were matched in that page.
*/
function buildChainForDepositInPage(
  depositActivity: Activity,
  depositIndex: number,
  pageActivitiesAfter: Activity[],
  accountKey: bigint,
  poolAddress: string
): { chain: NoteChain } {
  const depositNote: Note = {
    poolAddress,
    depositIndex,
    changeIndex: 0,
    amount: depositActivity.amount,
    transactionHash: depositActivity.transactionHash,
    blockNumber: depositActivity.blockNumber,
    timestamp: depositActivity.timestamp,
    status: "unspent",
    label: depositActivity.label || `Deposit #${depositIndex}`,
  };

  const chain: NoteChain = [depositNote];
  // Try to extend with withdrawals that are after this deposit within the same page
  extendChainInPlace(chain, pageActivitiesAfter, accountKey, poolAddress);

  return { chain };
}

/* ---------- Main discoverNotes function (complete) ---------- */
export async function discoverNotes(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint,
  opts?: {
    signal?: AbortSignal;
    onProgress?: (p: DiscoveryProgress) => void;
  }
): Promise<DiscoveryResult> {
  const signal = opts?.signal;
  const onProgress = opts?.onProgress;

  // Initialize progress object
  const progress: DiscoveryProgress = {
    pagesProcessed: 0,
    currentPageActivityCount: 0,
    depositsChecked: 0,
    depositsMatched: 0,
    lastCursor: undefined,
    complete: false,
  };

  // Emit initial progress
  onProgress?.({ ...progress });

  // Load cache (resume state)
  const cached = await noteCache.getCachedNotes(publicKey, poolAddress);
  let notes: NoteChain[] = cached?.notes ? [...cached.notes] : [];
  let lastUsedIndex = cached?.lastUsedIndex ?? -1;
  let nextDepositIndex = lastUsedIndex + 1;

  // liveDeposits store deposit indices -> chainIndex -> remaining balance
  type LiveDeposit = { depositIndex: number; chainIndex: number; remaining: bigint };
  let liveDeposits: LiveDeposit[] = [];

  // Initialize liveDeposits from cache if any
  notes.forEach((chain, idx) => {
    const last = chain[chain.length - 1];
    if (last.status === "unspent" && BigInt(last.amount) > 0n) {
      liveDeposits.push({
        depositIndex: chain[0].depositIndex,
        chainIndex: idx,
        remaining: BigInt(last.amount),
      });
    }
  });

  // Resume cursor if cached
  let cursor = cached?.lastProcessedCursor || undefined;
  let hasNext = true;
  let pagesProcessed = 0;

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  // Page loop
  while (hasNext) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // Fetch one page of generic activities (rate-limited via queuedRequest)
    const page = await fetchActivitiesPage(poolAddress, cursor, ACTIVITIES_PER_PAGE, { signal });
    const acts = page.activities;
    pagesProcessed++;

    // Update progress for page fetch
    progress.pagesProcessed = pagesProcessed;
    progress.currentPageActivityCount = acts.length;
    progress.lastCursor = page.pageInfo.endCursor;
    onProgress?.({ ...progress });

    // 1) Extend live deposits in-place using this page's activities
    if (liveDeposits.length > 0) {
      let withdrawalsThisPage = 0;

      // iterate over a shallow copy since we may modify liveDeposits within loop
      for (const ld of [...liveDeposits]) {
        const chain = notes[ld.chainIndex];
        if (!chain) continue; // defensive

        // Mutates chain in-place and returns number of new change notes appended
        const matched = extendChainInPlace(chain, acts, accountKey, poolAddress);
        if (matched > 0) {
          withdrawalsThisPage += matched;

          // Recompute last note and remaining balance
          const last = chain[chain.length - 1];
          if (last.status === "spent" || BigInt(last.amount) <= 0n) {
            // fully spent => remove from liveDeposits
            liveDeposits = liveDeposits.filter(
              (x) => !(x.depositIndex === ld.depositIndex && x.chainIndex === ld.chainIndex)
            );
          } else {
            // update remaining in liveDeposits
            const newRemaining = BigInt(last.amount);
            liveDeposits = liveDeposits.map((x) =>
              x.depositIndex === ld.depositIndex && x.chainIndex === ld.chainIndex
                ? { ...x, remaining: newRemaining }
                : x
            );
          }
        }
      }

      onProgress?.({ ...progress });
    }

    // 2) Scan this page for deposits for the sequential nextDepositIndex, nextDepositIndex+1, ...
    //    We only advance nextDepositIndex when we find it. If not found on this page we try again on later pages.
    while (true) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const candidate = nextDepositIndex;
      // Derive target precommitment for candidate deposit index
      const depNull = deriveDepositNullifier(accountKey, poolAddress, candidate);
      const depSec = deriveDepositSecret(accountKey, poolAddress, candidate);
      const targetPrecommitment = poseidon2([depNull, depSec]).toString();

      progress.depositsChecked++;
      onProgress?.({ ...progress });

      // Find deposit activity in this page
      const pos = acts.findIndex((a) => a.type === "DEPOSIT" && a.precommitmentHash === targetPrecommitment);

      if (pos === -1) {
        // Not found in this page: stop trying more candidates here
        break;
      }

      // Found deposit for candidate on this page
      const depositActivity = acts[pos];
      const activitiesAfter = acts.slice(pos + 1);

      // Build chain and extend with withdrawals that are in this page after the deposit
      const { chain: newChain } = buildChainForDepositInPage(
        depositActivity,
        candidate,
        activitiesAfter,
        accountKey,
        poolAddress
      );

      // Append chain to notes (chain is independent array)
      notes.push(newChain);
      const newChainIndex = notes.length - 1;

      // If chain still has unspent balance, add to liveDeposits to continue on later pages
      const lastNote = newChain[newChain.length - 1];
      if (lastNote.status === "unspent" && BigInt(lastNote.amount) > 0n) {
        liveDeposits.push({
          depositIndex: candidate,
          chainIndex: newChainIndex,
          remaining: BigInt(lastNote.amount),
        });
      }

      progress.depositsMatched++;
      lastUsedIndex = Math.max(lastUsedIndex, candidate);

      // Advance to next deposit index and attempt to find it still within this page
      nextDepositIndex = candidate + 1;
    }

    // 3) Persist after processing this page so we can resume later
    cursor = page.pageInfo.endCursor || cursor;
    await noteCache.storeDiscoveredNotes(publicKey, poolAddress, notes, cursor);

    // Re-emit progress after persistence
    progress.pagesProcessed = pagesProcessed;
    progress.currentPageActivityCount = acts.length;
    progress.lastCursor = cursor;
    onProgress?.({ ...progress });

    // 4) Advance to next page
    hasNext = page.pageInfo.hasNextPage;
    if (!hasNext) break;
  }

  // Done
  progress.complete = true;
  onProgress?.({ ...progress });

  // Logging summary
  console.log(
    `[DiscoveryV2] ✅ Done: ${notes.length} chains, +${progress.depositsMatched} deposits matched, lastUsedIndex=${lastUsedIndex}, lastCursor=${cursor}`
  );

  // Return discovery result (noteCache already persisted per page)
  return {
    notes,
    lastUsedIndex,
    newNotesFound: progress.depositsMatched,
    lastProcessedCursor: cursor,
  };
}

/* ---------- React hook: useNotes (complete) ---------- */
export function useNotes(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint
) {
  const [data, setData] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<DiscoveryProgress | null>(null);

  // Stable string key
  const accountKeyString = useMemo(() => accountKey.toString(), [accountKey]);

  // Track latest refresh
  const refreshIdRef = useRef(0);

  const runDiscovery = useCallback(
    async (signal?: AbortSignal, onProgress?: (p: DiscoveryProgress) => void) => {
      return discoverNotes(publicKey, poolAddress, accountKey, { signal, onProgress });
    },
    [publicKey, poolAddress, accountKey]
  );

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const runId = ++refreshIdRef.current;

    setLoading(true);
    setError(null);

    const onProgress = (p: DiscoveryProgress) => {
      if (runId === refreshIdRef.current) setProgress(p);
    };

    runDiscovery(signal, onProgress)
      .then((result) => {
        if (runId === refreshIdRef.current) setData(result);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (runId === refreshIdRef.current) setError(err as Error);
      })
      .finally(() => {
        if (runId === refreshIdRef.current) setLoading(false);
      });

    return () => controller.abort();
  }, [accountKeyString, poolAddress, publicKey, runDiscovery]);

  const refresh = useCallback(async () => {
    const runId = ++refreshIdRef.current;
    const controller = new AbortController();
    const signal = controller.signal;

    setLoading(true);
    setError(null);

    const onProgress = (p: DiscoveryProgress) => {
      if (runId === refreshIdRef.current) setProgress(p);
    };

    try {
      const result = await runDiscovery(signal, onProgress);
      if (runId === refreshIdRef.current) setData(result);
      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (runId === refreshIdRef.current) setError(err as Error);
      throw err;
    } finally {
      if (runId === refreshIdRef.current) setLoading(false);
    }
  }, [runDiscovery]);

  return { data, loading, error, progress, refresh };
}
