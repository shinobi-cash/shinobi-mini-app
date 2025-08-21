import { useState, useEffect, useCallback } from 'react';
import { useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { CashNoteData } from './useDepositCommitment';
import { PRIVACY_POOL_ENTRYPOINT_ABI } from '@/config/abis';
import { CONTRACTS } from '@/config/constants';

// Types for deposit functionality
export interface DepositRecord {
  timestamp: string
  nullifier: string
  secret: string
  precommitment: string
  commitment: string
  label: string
  transactionHash: string
  blockNumber: string
  depositIndex: number
  amount: string
  status: "deposited" | "asp_approved" | "withdrawn"
}
interface DepositState {
  isSuccess: boolean;
  error: string | null;
  depositRecord: DepositRecord | null;
}

export function useDepositTransaction() {
  const [state, setState] = useState<DepositState>({
    isSuccess: false,
    error: null,
    depositRecord: null,
  });

  const { 
    writeContract, 
    data: hash, 
    isPending: isLoading, 
    error: writeError 
  } = useWriteContract();
  
  const deposit = (amount: string, cashNoteData: CashNoteData) => {
    setState(prev => ({ 
      ...prev, 
      error: null,
      isSuccess: false,
      depositRecord: null 
    }));

    const amountWei = parseEther(amount);
    const precommitmentBigInt = cashNoteData.precommitment;

    // Call the deposit function on the privacy pool entry point
    writeContract({
      address: CONTRACTS.PRIVACY_POOL_ENTRYPOINT as `0x${string}`,
      abi: PRIVACY_POOL_ENTRYPOINT_ABI,
      functionName: 'deposit',
      args: [precommitmentBigInt],
      value: amountWei,
    });
  };

  // Handle transaction success
  useEffect(() => {
    if (hash) {
      setState(prev => ({
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
      setState(prev => ({
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
      depositRecord: null,
    });
  }, []);

  // Clear error when starting new transaction
  const clearError = () => {
    if (state.error) {
      setState(prev => ({ ...prev, error: null }));
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


