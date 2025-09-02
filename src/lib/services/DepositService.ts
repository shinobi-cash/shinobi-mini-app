/**
 * Deposit Service - Pure business logic
 * Extracted from useDepositCommitment.ts to separate deposit logic from storage and React coupling
 */

import type { IDepositStorageProvider } from "./interfaces/IDepositStorageProvider";
import { deriveDepositNullifier, deriveDepositSecret } from "@/utils/noteDerivation";
import { poseidon2 } from "poseidon-lite";

export interface CashNoteData {
  poolAddress: string;
  depositIndex: number;
  changeIndex: number;
  precommitment: bigint;
}

export interface DepositCommitmentResult {
  noteData: CashNoteData | null;
  error: string | null;
}

export class DepositService {
  constructor(private storageProvider: IDepositStorageProvider) {}

  /**
   * Generate deposit commitment - exact logic from useDepositCommitment.ts
   */
  async generateDepositCommitment(
    accountKey: bigint,
    publicKey: string,
    poolAddress: string
  ): Promise<DepositCommitmentResult> {
    try {
      // Use local cache to get next deposit index (privacy-first)
      const depositIndex = await this.storageProvider.getNextDepositIndex(publicKey, poolAddress);

      // Generate precommitment using local derivation - exact logic from original
      const depositNullifier = deriveDepositNullifier(accountKey, poolAddress, depositIndex);
      const depositSecret = deriveDepositSecret(accountKey, poolAddress, depositIndex);
      const precommitment = poseidon2([depositNullifier, depositSecret]);

      const noteData: CashNoteData = {
        poolAddress,
        depositIndex,
        changeIndex: 0,
        precommitment,
      };

      return {
        noteData,
        error: null,
      };
    } catch (error) {
      console.error("Failed to generate deposit commitment:", error);
      return {
        noteData: null,
        error: error instanceof Error ? error.message : "Failed to generate deposit commitment",
      };
    }
  }

  /**
   * Update deposit index after successful deposit
   */
  async updateDepositIndex(publicKey: string, poolAddress: string, depositIndex: number): Promise<void> {
    await this.storageProvider.updateLastUsedDepositIndex(publicKey, poolAddress, depositIndex);
  }
}