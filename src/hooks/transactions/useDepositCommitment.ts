import { useAuth } from "../../contexts/AuthContext";
import { CONTRACTS } from "../../config/constants";
import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { noteCache } from "@/lib/storage/noteCache";
import { deriveDepositNullifier, deriveDepositSecret } from "@/utils/noteDerivation";
import { poseidon2 } from "poseidon-lite";

// ---------------------------------------------------------------------------
// Note interface - uses data from collision service
// ---------------------------------------------------------------------------

export interface CashNoteData {
  poolAddress: string;
  depositIndex: number;
  changeIndex: number; // always 0 for deposits
  precommitment: bigint;
}

export interface DepositCashNoteResult {
  noteData: CashNoteData | null;
  isGeneratingNote: boolean;
  error: string | null;
  regenerateNote: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDepositCommitment(): DepositCashNoteResult {
  const { publicKey, accountKey } = useAuth();
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

      // Use local cache to get next deposit index (privacy-first)
      const depositIndex = await noteCache.getNextDepositIndex(publicKey, poolAddress);

      // Generate precommitment using local derivation
      const depositNullifier = deriveDepositNullifier(accountKey, poolAddress, depositIndex);
      const depositSecret = deriveDepositSecret(accountKey, poolAddress, depositIndex);
      const precommitment = poseidon2([depositNullifier, depositSecret]);

      const noteData: CashNoteData = {
        poolAddress,
        depositIndex,
        changeIndex: 0,
        precommitment,
      };

      setState((prev) => ({
        ...prev,
        noteData,
        isGeneratingNote: false,
        error: null,
      }));
    } catch (error) {
      console.error("Error generating deposit commitment:", error);
      setState((prev) => ({
        ...prev,
        noteData: null,
        isGeneratingNote: false,
        error: error instanceof Error ? error.message : "Failed to generate deposit commitment",
      }));
    }
  }, [address, accountKey, publicKey]);

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
