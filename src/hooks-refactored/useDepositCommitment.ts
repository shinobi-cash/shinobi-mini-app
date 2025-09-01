/**
 * Refactored Deposit Commitment Hook
 * Separates React state management from deposit business logic and storage
 */

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { CONTRACTS } from "@/config/constants";
import { DepositService, type CashNoteData } from "@/lib/services-refactored/DepositService";
import { DepositStorageProviderAdapter } from "@/lib/services-refactored/adapters/DepositStorageProviderAdapter";

// Create service instances
const storageProvider = new DepositStorageProviderAdapter();
const depositService = new DepositService(storageProvider);

export interface DepositCashNoteResult {
  noteData: CashNoteData | null;
  isGeneratingNote: boolean;
  error: string | null;
  regenerateNote: () => Promise<void>;
}

/**
 * Hook for deposit commitment generation with decoupled storage and business logic
 */
export function useDepositCommitment(
  publicKey: string | null,
  accountKey: bigint | null
): DepositCashNoteResult {
  const { address } = useAccount();

  const [state, setState] = useState<{
    noteData: CashNoteData | null;
    isGeneratingNote: boolean;
    error: string | null;
  }>({
    noteData: null,
    isGeneratingNote: true,
    error: null,
  });

  const generateNewDepositCommitment = useCallback(async () => {
    if (!address || !accountKey || !publicKey) {
      setState((prev) => ({ ...prev, noteData: null, isGeneratingNote: false }));
      return;
    }

    setState((prev) => ({ ...prev, isGeneratingNote: true, error: null }));

    try {
      const poolAddress = CONTRACTS.ETH_PRIVACY_POOL;

      // Use deposit service instead of direct storage call
      const result = await depositService.generateDepositCommitment(accountKey, publicKey, poolAddress);

      setState({
        noteData: result.noteData,
        isGeneratingNote: false,
        error: result.error,
      });
    } catch (error) {
      console.error("Failed to generate deposit commitment:", error);
      setState({
        noteData: null,
        isGeneratingNote: false,
        error: error instanceof Error ? error.message : "Failed to generate deposit commitment",
      });
    }
  }, [address, accountKey, publicKey]);

  // Auto-generate on mount and when dependencies change - exact logic from original
  useEffect(() => {
    generateNewDepositCommitment();
  }, [generateNewDepositCommitment]);

  return {
    noteData: state.noteData,
    isGeneratingNote: state.isGeneratingNote,
    error: state.error,
    regenerateNote: generateNewDepositCommitment,
  };
}