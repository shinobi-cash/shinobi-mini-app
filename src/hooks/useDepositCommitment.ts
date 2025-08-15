import { useSetupStore } from '../stores/setupStore';
import { poseidon2 } from 'poseidon-lite';
import BigNumber from 'bignumber.js';
import { SNARK_SCALAR_FIELD } from '../config/snark';
import { CONTRACTS } from '../config/contracts';
import { useMemo } from 'react';

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
    const accountKey = privateKey || (mnemonic ? mnemonic.join('') : '');
    if (!accountKey) return null;

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
  const hash = poseidon2([BigNumber(combined).toFixed(), '0']);
  return new BigNumber(hash.toString()).mod(new BigNumber(SNARK_SCALAR_FIELD)).toFixed();
}

/**
 * Derive a field element from seed, pool address, and index
 */
function deriveFieldElement(seed: string, poolAddress: string, index: number): string {
  const input = [
    seed,
    poolAddress,
    index.toString()
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