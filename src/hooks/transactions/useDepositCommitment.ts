import { useAuth } from '../../contexts/AuthContext';
import { CONTRACTS } from '../../config/constants';
import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { generateUniqueDepositCommitment } from "@/services/privacy/depositCollisionService";

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
      setState(prev => ({ ...prev, noteData: null, isGeneratingNote: false }));
      return;
    }

    setState(prev => ({ ...prev, isGeneratingNote: true, error: null }));

    try {
      const poolAddress = CONTRACTS.ETH_PRIVACY_POOL;
      
      // Use the collision service to generate unique commitment
      const commitmentData = await generateUniqueDepositCommitment(
        accountKey,
        poolAddress,
        publicKey
      );

      const noteData: CashNoteData = {
        poolAddress: commitmentData.poolAddress,
        depositIndex: commitmentData.depositIndex,
        changeIndex: commitmentData.changeIndex,
        precommitment: commitmentData.precommitment,
      };

      setState(prev => ({
        ...prev,
        noteData,
        isGeneratingNote: false,
        error: null,
      }));
    } catch (error) {
      console.error('Error generating deposit commitment:', error);
      setState(prev => ({
        ...prev,
        noteData: null,
        isGeneratingNote: false,
        error: error instanceof Error ? error.message : 'Failed to generate deposit commitment',
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