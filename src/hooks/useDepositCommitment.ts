import { useAuth } from '../contexts/AuthContext';
import { poseidon2 } from 'poseidon-lite';
import BigNumber from 'bignumber.js';
import { SNARK_SCALAR_FIELD } from '../config/snark';
import { CONTRACTS } from '../config/contracts';
import { useState, useEffect, useCallback } from 'react';
import { keccak256, toBytes } from 'viem';
import { restoreFromMnemonic } from '../utils/crypto';
import { useAccount } from 'wagmi';
import { noteCache } from '../lib/noteCache';
import { fetchDepositByPrecommitment } from '../lib/apollo';

// Cash note data - like a currency note with unique cryptographic properties
export interface CashNoteData {
  nullifier: string;
  secret: string;
  precommitment: string;
  noteIndex: number; // The unique index of this cash note
}

// Hook result interface
export interface DepositCashNoteResult {
  noteData: CashNoteData | null;
  isGeneratingNote: boolean;
  error: string | null;
  regenerateNote: () => Promise<void>;
}

/**
 * Hook to generate a unique cash note for deposit
 * Each note is like a currency note with unique cryptographic properties
 * Automatically finds the next available note index and ensures no collisions
 */
export function useDepositCommitment(): DepositCashNoteResult {
  const { mnemonic, privateKey } = useAuth();
  const { address } = useAccount();
  
  const [state, setState] = useState<{
    noteData: CashNoteData | null;
    isGeneratingNote: boolean;
    error: string | null;
  }>({
    noteData: null,
    isGeneratingNote: false,
    error: null,
  });

  const generateUniqueNote = useCallback(async () => {
    if (!address || !privateKey) {
      setState(prev => ({ ...prev, noteData: null, isGeneratingNote: false }));
      return;
    }

    setState(prev => ({ ...prev, isGeneratingNote: true, error: null }));
    
    try {
      // Get the account key
      let accountKey: string;
      if (privateKey) {
        accountKey = privateKey;
      } else if (mnemonic) {
        const restoredKeys = restoreFromMnemonic(mnemonic);
        accountKey = restoredKeys.privateKey;
      } else {
        throw new Error('No account key available');
      }

      const poolAddress = CONTRACTS.ETH_PRIVACY_POOL;
      
      // Get next available note index
      let candidateNoteIndex = await noteCache.getNextNoteIndex(accountKey, poolAddress);
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        // Generate cash note for this index
        const nullifier = deriveNullifier(accountKey, poolAddress, candidateNoteIndex);
        const secret = deriveSecret(accountKey, poolAddress, candidateNoteIndex);
        const precommitment = generatePrecommitment(nullifier, secret);
        
        // Check if this note's precommitment already exists on-chain
        const depositData = await fetchDepositByPrecommitment(precommitment);
        const noteExists = !!depositData;
        
        if (!noteExists) {
          // Success! Update storage and return the cash note
          await noteCache.updateLastUsedNoteIndex(accountKey, poolAddress, candidateNoteIndex);
          
          const noteData: CashNoteData = {
            nullifier,
            secret,
            precommitment,
            noteIndex: candidateNoteIndex,
          };
          
          setState(prev => ({
            ...prev,
            noteData,
            isGeneratingNote: false,
            error: null,
          }));
          return;
        }
        
        // Collision detected, try next note index
        console.warn(`Cash note collision detected at index ${candidateNoteIndex}, trying next index`);
        candidateNoteIndex++;
        attempts++;
      }
      
      throw new Error(`Failed to generate unique cash note after ${maxAttempts} attempts`);
      
    } catch (error) {
      console.error('Error generating cash note:', error);
      setState(prev => ({
        ...prev,
        noteData: null,
        isGeneratingNote: false,
        error: error instanceof Error ? error.message : 'Failed to generate cash note',
      }));
    }
  }, [address, privateKey, mnemonic]);

  useEffect(() => {
    generateUniqueNote();
  }, [generateUniqueNote]);

  return {
    noteData: state.noteData,
    isGeneratingNote: state.isGeneratingNote,
    error: state.error,
    regenerateNote: generateUniqueNote,
  };
}

/**
 * Derive nullifier for a cash note using hash-based domain separation
 */
export function deriveNullifier(accountKey: string, poolAddress: string, noteIndex: number): string {
  // Create domain-separated seed for nullifiers
  const nullifierSeed = createDomainSeed(accountKey, "nullifier");
  return deriveFieldElement(nullifierSeed, poolAddress, noteIndex);
}

/**
 * Derive secret for a cash note using hash-based domain separation
 */
export function deriveSecret(accountKey: string, poolAddress: string, noteIndex: number): string {
  // Create domain-separated seed for secrets
  const secretSeed = createDomainSeed(accountKey, "secret");
  return deriveFieldElement(secretSeed, poolAddress, noteIndex);
}

/**
 * Create domain-separated seed by hashing accountKey + domain
 */
function createDomainSeed(accountKey: string, domain: string): string {
  const combined = accountKey + domain;
  
  // Hash the combined string using keccak256 to get hex value
  const hash = keccak256(toBytes(combined));
  
  // Convert hex to BigNumber and ensure it's within scalar field
  const hashBigNumber = new BigNumber(hash);
  return hashBigNumber.mod(new BigNumber(SNARK_SCALAR_FIELD)).toFixed();
}

/**
 * Derive a field element from seed, pool address, and note index
 */
function deriveFieldElement(seed: string, poolAddress: string, noteIndex: number): string {
  // Combine pool address and note index into a single value using keccak256
  const combined = poolAddress + noteIndex.toString();
  const hash = keccak256(toBytes(combined));
  const combinedValue = new BigNumber(hash).mod(new BigNumber(SNARK_SCALAR_FIELD)).toFixed();

  // Now use poseidon2 with exactly 2 inputs
  const poseidonHash = poseidon2([seed, combinedValue]);
  return new BigNumber(poseidonHash.toString()).mod(new BigNumber(SNARK_SCALAR_FIELD)).toFixed();
}

/**
 * Generate precommitment using Poseidon hash of nullifier and secret
 * This is the "face value" of the cash note that gets committed on-chain
 */
export function generatePrecommitment(nullifier: string, secret: string): string {
  const precommitmentHash = poseidon2([nullifier, secret]);
  return new BigNumber(precommitmentHash.toString()).mod(new BigNumber(SNARK_SCALAR_FIELD)).toFixed();
}

/**
 * Utility to convert string to BigInt for contract interactions
 */
export function commitmentToBigInt(commitment: string): bigint {
  return BigInt(commitment);
}

// For backward compatibility
export type CommitmentData = CashNoteData;