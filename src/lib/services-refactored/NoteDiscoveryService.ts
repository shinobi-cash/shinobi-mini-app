/**
 * Note Discovery Service - Pure business logic
 * Extracted from useDepositDiscovery.ts to separate discovery algorithms from storage coupling
 */

import type { Activity } from "@/lib/indexer/sdk";
import type { Note, NoteChain, DiscoveryResult } from "@/lib/storage-refactored/interfaces/IDataTypes";
import type { INoteStorageProvider } from "./interfaces/INoteStorageProvider";
import { fetchActivities } from "@/services/data/indexerService";
import { deriveChangeNullifier, deriveDepositNullifier, deriveDepositSecret } from "@/utils/noteDerivation";
import { poseidon1, poseidon2 } from "poseidon-lite";

const ACTIVITIES_PER_PAGE = 100;

export interface DiscoveryProgress {
  pagesProcessed: number;
  currentPageActivityCount: number;
  depositsChecked: number;
  depositsMatched: number;
  lastCursor?: string;
  complete: boolean;
}

export interface DiscoveryOptions {
  signal?: AbortSignal;
  onProgress?: (progress: DiscoveryProgress) => void;
}

export class NoteDiscoveryService {
  constructor(private storageProvider: INoteStorageProvider) {}

  /**
   * Discover notes for account - pure business logic extracted from useDepositDiscovery
   */
  async discoverNotes(
    publicKey: string,
    poolAddress: string,
    accountKey: bigint,
    options?: DiscoveryOptions
  ): Promise<DiscoveryResult> {
    const { signal, onProgress } = options || {};

    // Initialize progress
    const progress: DiscoveryProgress = {
      pagesProcessed: 0,
      currentPageActivityCount: 0,
      depositsChecked: 0,
      depositsMatched: 0,
      lastCursor: undefined,
      complete: false,
    };

    onProgress?.(progress);

    // Load cache to resume state
    const cached = await this.storageProvider.getCachedNotes(publicKey, poolAddress);
    const notes: NoteChain[] = cached?.notes ? [...cached.notes] : [];
    let lastUsedIndex = cached?.lastUsedIndex ?? -1;
    let nextDepositIndex = lastUsedIndex + 1;

    // Track live deposits for extension
    type LiveDeposit = { depositIndex: number; chainIndex: number; remaining: bigint };
    let liveDeposits: LiveDeposit[] = [];

    // Initialize live deposits from cache
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

    let cursor = cached?.lastProcessedCursor || undefined;
    let hasNext = true;
    let pagesProcessed = 0;

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // Main discovery loop - exact logic from original
    while (hasNext) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const activitiesResult = await fetchActivities(poolAddress, ACTIVITIES_PER_PAGE, cursor, "asc");
      const activities: Activity[] = activitiesResult.items;
      cursor = activitiesResult.pageInfo.endCursor;
      pagesProcessed++;

      progress.pagesProcessed = pagesProcessed;
      progress.currentPageActivityCount = activities.length;
      progress.lastCursor = cursor;
      onProgress?.(progress);

      // 1) Extend live deposits using this page's activities
      if (liveDeposits.length > 0) {
        for (const liveDeposit of [...liveDeposits]) {
          const chain = notes[liveDeposit.chainIndex];
          if (!chain) continue;

          const withdrawalsMatched = this.extendChainInPlace(chain, activities, accountKey, poolAddress);
          if (withdrawalsMatched > 0) {
            const lastNote = chain[chain.length - 1];
            if (lastNote.status === "spent" || BigInt(lastNote.amount) <= 0n) {
              liveDeposits = liveDeposits.filter(
                (deposit) =>
                  !(deposit.depositIndex === liveDeposit.depositIndex && deposit.chainIndex === liveDeposit.chainIndex)
              );
            } else {
              const newRemaining = BigInt(lastNote.amount);
              liveDeposits = liveDeposits.map((deposit) =>
                deposit.depositIndex === liveDeposit.depositIndex && deposit.chainIndex === liveDeposit.chainIndex
                  ? { ...deposit, remaining: newRemaining }
                  : deposit
              );
            }
          }
        }
        onProgress?.(progress);
      }

      // 2) Scan for new deposits
      while (true) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

        const candidateDepositIndex = nextDepositIndex;
        const depositNullifier = deriveDepositNullifier(accountKey, poolAddress, candidateDepositIndex);
        const depositSecret = deriveDepositSecret(accountKey, poolAddress, candidateDepositIndex);
        const targetPrecommitment = poseidon2([depositNullifier, depositSecret]).toString();

        progress.depositsChecked++;
        onProgress?.(progress);

        const depositPosition = activities.findIndex(
          (activity) => activity.type === "DEPOSIT" && activity.precommitmentHash === targetPrecommitment
        );

        if (depositPosition === -1) break;

        const depositActivity = activities[depositPosition];
        const activitiesAfter = activities.slice(depositPosition + 1);

        const { chain: newChain } = this.buildChainForDepositInPage(
          depositActivity,
          candidateDepositIndex,
          activitiesAfter,
          accountKey,
          poolAddress
        );

        notes.push(newChain);
        const newChainIndex = notes.length - 1;

        const lastNote = newChain[newChain.length - 1];
        if (lastNote.status === "unspent" && BigInt(lastNote.amount) > 0n) {
          liveDeposits.push({
            depositIndex: candidateDepositIndex,
            chainIndex: newChainIndex,
            remaining: BigInt(lastNote.amount),
          });
        }

        progress.depositsMatched++;
        lastUsedIndex = Math.max(lastUsedIndex, candidateDepositIndex);
        nextDepositIndex = candidateDepositIndex + 1;
      }

      // 3) Persist after processing page
      await this.storageProvider.storeDiscoveredNotes(publicKey, poolAddress, notes, cursor);

      progress.pagesProcessed = pagesProcessed;
      progress.currentPageActivityCount = activities.length;
      progress.lastCursor = cursor;
      onProgress?.(progress);

      hasNext = activitiesResult.pageInfo.hasNextPage;
      if (!hasNext) break;
    }

    progress.complete = true;
    onProgress?.(progress);

    console.log(
      `[DiscoveryV2] ✅ Done: ${notes.length} chains, +${progress.depositsMatched} deposits matched, lastUsedIndex=${lastUsedIndex}, lastCursor=${cursor}`
    );

    return {
      notes,
      lastUsedIndex,
      newNotesFound: progress.depositsMatched,
      lastProcessedCursor: cursor,
    };
  }

  /**
   * Extend chain in place - pure algorithm from useDepositDiscovery
   */
  private extendChainInPlace(
    chain: NoteChain,
    pageActivities: Activity[],
    accountKey: bigint,
    poolAddress: string
  ): number {
    let withdrawalsMatched = 0;
    const lastNote = chain[chain.length - 1];
    let remaining = BigInt(lastNote.amount);
    let changeIndex = lastNote.changeIndex === 0 ? 1 : lastNote.changeIndex + 1;

    let currentNullifier: bigint;
    if (lastNote.changeIndex === 0) {
      currentNullifier = deriveDepositNullifier(accountKey, poolAddress, chain[0].depositIndex);
    } else {
      currentNullifier = deriveChangeNullifier(accountKey, poolAddress, chain[0].depositIndex, lastNote.changeIndex);
    }

    while (true) {
      const nullifierHash = poseidon1([currentNullifier]).toString();

      const withdrawal = pageActivities.find(
        (activity) => activity.type === "WITHDRAWAL" && activity.spentNullifier === nullifierHash
      );

      if (!withdrawal || !withdrawal.newCommitment) break;

      chain[chain.length - 1].status = "spent";
      remaining -= BigInt(withdrawal.amount);

      const changeNote: Note = {
        poolAddress: chain[0].poolAddress,
        depositIndex: chain[0].depositIndex,
        changeIndex,
        amount: remaining.toString(),
        transactionHash: withdrawal.transactionHash,
        blockNumber: withdrawal.blockNumber,
        timestamp: withdrawal.timestamp,
        status: remaining > 0n ? "unspent" : "spent",
        label: chain[0].label,
      };

      chain.push(changeNote);
      withdrawalsMatched++;

      if (remaining <= 0n) break;

      currentNullifier = deriveChangeNullifier(accountKey, poolAddress, chain[0].depositIndex, changeIndex);
      changeIndex++;
    }

    return withdrawalsMatched;
  }

  /**
   * Build chain for deposit - pure algorithm from useDepositDiscovery
   */
  private buildChainForDepositInPage(
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
    this.extendChainInPlace(chain, pageActivitiesAfter, accountKey, poolAddress);

    return { chain };
  }
}