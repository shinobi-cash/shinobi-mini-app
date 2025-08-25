/**
 * Service for handling deposit commitment collision detection
 * Extracted from useDepositCommitment hook for better organization
 */

import { noteCache } from '../lib/noteCache';
import { fetchDepositByPrecommitment } from './queryService';
import { deriveDepositNullifier, deriveDepositSecret } from '../utils/noteDerivation';
import { poseidon2 } from 'poseidon-lite';

export interface DepositCommitmentData {
  poolAddress: string;
  depositIndex: number;
  changeIndex: number; // always 0 for deposits
  precommitment: bigint;
}

/**
 * Generates a unique deposit commitment by checking for collisions
 * @param accountKey - The account's private key for derivation
 * @param poolAddress - The pool contract address
 * @param publicKey - The user's public key for cache management
 * @param maxAttempts - Maximum number of collision attempts (default: 5)
 * @returns Promise<DepositCommitmentData> - The unique deposit commitment data
 * @throws Error if unable to generate unique commitment after max attempts
 */
export async function generateUniqueDepositCommitment(
  accountKey: bigint,
  poolAddress: string,
  publicKey: string,
  maxAttempts: number = 5
): Promise<DepositCommitmentData> {
  // Start from the next available deposit index based on the cache
  let candidateDepositIndex = await noteCache.getNextDepositIndex(publicKey, poolAddress);
  let attempts = 0;

  // Loop to find a non-colliding deposit index
  while (attempts < maxAttempts) {
    const nullifier = deriveDepositNullifier(accountKey, poolAddress, candidateDepositIndex);
    const secret = deriveDepositSecret(accountKey, poolAddress, candidateDepositIndex);
    const precommitment = poseidon2([nullifier, secret]);

    // Check if this precommitment is already a deposit on-chain
    const depositData = await fetchDepositByPrecommitment(precommitment.toString());
    const noteExists = !!depositData;

    if (!noteExists) {
      // Found a unique, unused deposit index. Store it.
      await noteCache.updateLastUsedDepositIndex(publicKey, poolAddress, candidateDepositIndex);

      return {
        poolAddress,
        depositIndex: candidateDepositIndex,
        changeIndex: 0,
        precommitment: precommitment,
      };
    }

    console.warn(`Deposit collision detected at index=${candidateDepositIndex}, retrying.`);
    candidateDepositIndex++;
    attempts++;
  }

  throw new Error(`Failed to generate a unique deposit note after ${maxAttempts} attempts.`);
}