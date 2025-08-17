import { useState, useEffect, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import { 
  CONTRACTS, 
  PRIVACY_POOL_ENTRYPOINT_ABI, 
  PRIVACY_POOL_ABI,
  DepositRecord,
  GAS_LIMITS 
} from '../config/contracts';
import { commitmentToBigInt, CashNoteData } from './useDepositCommitment';

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
  
  const { 
    data: receipt, 
    isLoading: isConfirming,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = (amount: string, cashNoteData: CashNoteData) => {
    setState(prev => ({ 
      ...prev, 
      error: null,
      isSuccess: false,
      depositRecord: null 
    }));

    const amountWei = parseEther(amount);
    const precommitmentBigInt = commitmentToBigInt(cashNoteData.precommitment);

    // Call the deposit function on the privacy pool entry point
    writeContract({
      address: CONTRACTS.PRIVACY_POOL_ENTRYPOINT as `0x${string}`,
      abi: PRIVACY_POOL_ENTRYPOINT_ABI,
      functionName: 'deposit',
      args: [precommitmentBigInt],
      value: amountWei,
      gas: GAS_LIMITS.DEPOSIT,
    });
  };

  // Handle errors
  useEffect(() => {
    const error = writeError || receiptError;
    if (error) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isSuccess: false,
      }));
    }
  }, [writeError, receiptError]);

  // Process transaction receipt when available
  useEffect(() => {
    if (receipt && !state.isSuccess) {
      processDepositReceipt(receipt, setState);
    }
  }, [receipt, state.isSuccess]);

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
    isConfirming,
    transactionHash: hash,
    ...state,
  };
}

// Helper function to process transaction receipt and extract deposit data
function processDepositReceipt(
  receipt: any,
  setState: React.Dispatch<React.SetStateAction<DepositState>>
) {
  try {
    // Find the Privacy Pool Deposited event
    const depositedLog = receipt.logs.find((log: any) => {
      try {
        // Try to decode as Privacy Pool Deposited event
        const decoded = decodeEventLog({
          abi: PRIVACY_POOL_ABI,
          data: log.data,
          topics: log.topics,
        });
        return decoded.eventName === 'Deposited';
      } catch {
        return false;
      }
    });

    if (!depositedLog) {
      throw new Error('Privacy Pool Deposited event not found in transaction receipt');
    }

    // Decode the event to extract commitment hash and label
    const event = decodeEventLog({
      abi: PRIVACY_POOL_ABI,
      data: depositedLog.data,
      topics: depositedLog.topics,
    }) as any;

    // Create deposit record (similar to script format)
    const depositRecord: DepositRecord = {
      timestamp: new Date().toISOString(),
      nullifier: '', // Will be filled from commitment data
      secret: '', // Will be filled from commitment data
      precommitment: '', // Will be filled from commitment data
      commitment: event.args._commitment.toString(),
      label: event.args._label.toString(),
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber.toString(),
      depositIndex: 0, // For now, will implement proper indexing later
      amount: event.args._value.toString(),
      status: 'deposited',
    };

    setState(prev => ({
      ...prev,
      isConfirming: false,
      isSuccess: true,
      depositRecord,
    }));

  } catch (error) {
    console.error('Failed to process deposit receipt:', error);
    setState(prev => ({
      ...prev,
      isConfirming: false,
      error: 'Failed to process transaction receipt',
    }));
  }
}

