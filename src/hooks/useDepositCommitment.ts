import { useSetupStore } from '../stores/setupStore';
import { poseidon2 } from 'poseidon-lite';
import BigNumber from 'bignumber.js';
import { SNARK_SCALAR_FIELD } from '../config/snark';
import { CONTRACTS } from '../config/contracts';
import { useMemo } from 'react';
import { keccak256, toBytes } from 'viem';
import { restoreFromMnemonic } from '../utils/crypto';

export interface CommitmentData {
  nullifier: string;
  secret: string;
  precommitment: string;
}

/**
 * Hook to generate nullifier, secret, and precommitment for deposit
 * Uses pool-specific derivation with index 0 for now (first pair)
 */
export function useDepositCommitment(): CommitmentData | null {
  const { mnemonic, privateKey } = useSetupStore();

  return useMemo(() => {
    // Get the actual private key, either directly or derived from mnemonic
    let accountKey: string;
    if (privateKey) {
      accountKey = privateKey;
    } else if (mnemonic) {
      try {
        const restoredKeys = restoreFromMnemonic(mnemonic);
        accountKey = restoredKeys.privateKey;
      } catch (error) {
        console.error('Failed to restore private key from mnemonic:', error);
        return null;
      }
    } else {
      return null;
    }

    try {
      const poolAddress = CONTRACTS.ETH_PRIVACY_POOL;
      const index = 0; // First pair for now

      // Derive nullifier and secret using new approach
      const nullifier = deriveNullifier(accountKey, poolAddress, index);
      const secret = deriveSecret(accountKey, poolAddress, index);

      // Generate precommitment using Poseidon hash
      const precommitment = generatePrecommitment(nullifier, secret);

      return {
        nullifier,
        secret,
        precommitment,
      };
    } catch (error) {
      console.error('Error generating commitment:', error);
      return null;
    }
  }, [mnemonic, privateKey]);
}

/**
 * Derive nullifier using Option C approach: hash-based domain separation
 */
function deriveNullifier(accountKey: string, poolAddress: string, index: number): string {
  // Create domain-separated seed for nullifiers
  const nullifierSeed = createDomainSeed(accountKey, "nullifier");
  return deriveFieldElement(nullifierSeed, poolAddress, index);
}

/**
 * Derive secret using Option C approach: hash-based domain separation
 */
function deriveSecret(accountKey: string, poolAddress: string, index: number): string {
  // Create domain-separated seed for secrets
  const secretSeed = createDomainSeed(accountKey, "secret");
  return deriveFieldElement(secretSeed, poolAddress, index);
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
 * Derive a field element from seed, pool address, and index
 */
function deriveFieldElement(seed: string, poolAddress: string, index: number): string {
  // Combine pool address and index into a single value using keccak256
  const combined = poolAddress + index.toString();
  const hash = keccak256(toBytes(combined));
  const combinedValue = new BigNumber(hash).mod(new BigNumber(SNARK_SCALAR_FIELD)).toFixed();

  // Now use poseidon2 with exactly 2 inputs
  const poseidonHash = poseidon2([seed, combinedValue]);
  return new BigNumber(poseidonHash.toString()).mod(new BigNumber(SNARK_SCALAR_FIELD)).toFixed();
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