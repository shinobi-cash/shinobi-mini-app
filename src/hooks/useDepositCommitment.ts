import { useAuth } from '../contexts/AuthContext';
import { CONTRACTS } from '../config/constants';
import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { noteCache } from '../lib/noteCache';
import { fetchDepositByPrecommitment } from '../services/queryService';

import { deriveDepositNullifier, deriveDepositSecret, } from '../utils/noteDerivation';
import { poseidon2 } from 'poseidon-lite';

// ---------------------------------------------------------------------------
// Slimmed down note interface
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

      // Start from the next available deposit index based on the cache
      let candidateDepositIndex = await noteCache.getNextDepositIndex(
        publicKey,
        poolAddress
      );

      let attempts = 0;
      const maxAttempts = 5;

      // Loop to find a non-colliding deposit index
      while (attempts < maxAttempts) {
        const nullifier = deriveDepositNullifier(
          accountKey,
          poolAddress,
          candidateDepositIndex
        );
        const secret = deriveDepositSecret(
          accountKey,
          poolAddress,
          candidateDepositIndex
        );
        const precommitment = poseidon2([nullifier, secret]);

        // Check if this precommitment is already a deposit on-chain
        const depositData = await fetchDepositByPrecommitment(precommitment.toString());
        const noteExists = !!depositData;

        if (!noteExists) {
          // Found a unique, unused deposit index. Store it.
          await noteCache.updateLastUsedDepositIndex(
            publicKey,
            poolAddress,
            candidateDepositIndex
          );

          const noteData: CashNoteData = {
            poolAddress,
            depositIndex: candidateDepositIndex,
            changeIndex: 0,
            precommitment: precommitment,
          };

          setState(prev => ({
            ...prev,
            noteData,
            isGeneratingNote: false,
            error: null,
          }));
          return;
        }

        console.warn(`Deposit collision detected at index=${candidateDepositIndex}, retrying.`);
        candidateDepositIndex++;
        attempts++;
      }

      throw new Error(`Failed to generate a unique deposit note after ${maxAttempts} attempts.`);
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