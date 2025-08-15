import { useSetupStore } from '../stores/setupStore';
import { poseidon2 } from 'poseidon-lite';
import BigNumber from 'bignumber.js';
import { SNARK_SCALAR_FIELD } from '../config/snark';
import { useMemo } from 'react';

export interface CommitmentData {
  nullifier: string;
  secret: string;
  precommitment: string;
}

/**
 * Hook to generate nullifier, secret, and precommitment for deposit
 * Uses index 0 for now (first pair)
 */
export function useDepositCommitment(): CommitmentData | null {
  const { mnemonic, privateKey } = useSetupStore();

  return useMemo(() => {
    const seed = privateKey || (mnemonic ? mnemonic.join('') : '');
    if (!seed) return null;

    // Derive nullifier and secret using index 0
    const nullifier = deriveFieldElement(seed, 0);
    const secret = deriveFieldElement(seed, 0 + 1000);

    // Generate precommitment using Poseidon hash
    const precommitment = generatePrecommitment(nullifier, secret);

    return {
      nullifier,
      secret,
      precommitment,
    };
  }, [mnemonic, privateKey]);
}

/**
 * Derive a field element from seed and index (same logic as ProfileScreen)
 */
function deriveFieldElement(seed: string, index: number): string {
  const input = [
    BigNumber(seed).plus(index).toFixed(),
    '0'
  ];
  const hash = poseidon2(input);
  return new BigNumber(hash.toString()).mod(new BigNumber(SNARK_SCALAR_FIELD)).toFixed();
}

/**
 * Generate precommitment using Poseidon hash of nullifier and secret
 */
function generatePrecommitment(nullifier: string, secret: string): string {
  const precommitmentHash = poseidon2([nullifier, secret]);
  return new BigNumber(precommitmentHash.toString()).mod(new BigNumber(SNARK_SCALAR_FIELD)).toFixed();
}

/**
 * Utility to convert string to BigInt for contract interactions
 */
export function commitmentToBigInt(commitment: string): bigint {
  return BigInt(commitment);
}