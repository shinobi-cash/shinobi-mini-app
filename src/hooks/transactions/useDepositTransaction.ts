import { PRIVACY_POOL_ENTRYPOINT_ABI } from "@/config/abis";
import { CONTRACTS } from "@/config/constants";
import { useCallback, useEffect, useState } from "react";
import { parseEther } from "viem";
import { useWriteContract } from "wagmi";
import type { CashNoteData } from "./useDepositCommitment";

interface DepositState {
  isSuccess: boolean;
  error: string | null;
}

export function useDepositTransaction() {
  const [state, setState] = useState<DepositState>({
    isSuccess: false,
    error: null,
  });

  const { writeContract, data: hash, isPending: isLoading, error: writeError } = useWriteContract();

  const deposit = (amount: string, cashNoteData: CashNoteData) => {
    setState((prev) => ({
      ...prev,
      error: null,
      isSuccess: false,
    }));

    const amountWei = parseEther(amount);
    const precommitmentBigInt = cashNoteData.precommitment;

    // Call the deposit function on the privacy pool entry point
    writeContract({
      address: CONTRACTS.PRIVACY_POOL_ENTRYPOINT as `0x${string}`,
      abi: PRIVACY_POOL_ENTRYPOINT_ABI,
      functionName: "deposit",
      args: [precommitmentBigInt],
      value: amountWei,
    });
  };

  // Handle transaction success
  useEffect(() => {
    if (hash) {
      setState((prev) => ({
        ...prev,
        isSuccess: true,
        error: null,
      }));
    }
  }, [hash]);

  // Handle errors
  useEffect(() => {
    const error = writeError;
    if (error) {
      setState((prev) => ({
        ...prev,
        error: error.message,
        isSuccess: false,
      }));
    }
  }, [writeError]);

  const reset = useCallback(() => {
    setState({
      isSuccess: false,
      error: null,
    });
  }, []);

  // Clear error when starting new transaction
  const clearError = () => {
    if (state.error) {
      setState((prev) => ({ ...prev, error: null }));
    }
  };

  return {
    deposit,
    reset,
    clearError,
    isLoading,
    transactionHash: hash,
    ...state,
  };
}
