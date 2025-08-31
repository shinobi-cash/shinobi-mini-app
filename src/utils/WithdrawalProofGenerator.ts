/**
 * Withdrawal Proof Generator for Privacy Pool
 *
 * This module provides utilities for generating real zero-knowledge proofs
 * for Privacy Pool withdrawal operations using snarkjs and circuit files.
 *
 * Features:
 * - Real ZK proof generation using withdrawal circuits
 * - Merkle tree construction for state and ASP trees
 * - Proof verification using verification keys
 */

import { LeanIMT, type LeanIMTMerkleProof } from "@zk-kit/lean-imt";
import { poseidon2 } from "poseidon-lite";
import * as snarkjs from "snarkjs";

// ============ TYPES ============

export interface WithdrawalProofData {
  proof: snarkjs.Groth16Proof;
  publicSignals: string[];
}

interface CircuitFiles {
  wasmFile: Uint8Array;
  zkeyFile: Uint8Array;
  vkeyData: object;
}

interface WithdrawalProofArgs {
  existingCommitmentHash: bigint;
  existingValue: bigint;
  existingNullifier: bigint;
  existingSecret: bigint;
  withdrawalValue: bigint;
  context: bigint;
  label: bigint;
  newNullifier: bigint;
  newSecret: bigint;
  stateTreeCommitments: bigint[];
  aspTreeLabels: bigint[];
}

// ============ CONFIGURATION ============

const MAX_TREE_DEPTH = 32;

// Browser-compatible circuit file loading
const loadCircuitFiles = async (): Promise<CircuitFiles> => {
  try {
    console.log("📥 Loading circuit files...");

    // Load circuit files from public directory
    const [wasmResponse, zkeyResponse, vkeyResponse] = await Promise.all([
      fetch("/circuits/build/withdraw/withdraw.wasm"),
      fetch("/circuits/keys/withdraw.zkey"),
      fetch("/circuits/keys/withdraw.vkey"),
    ]);

    if (!wasmResponse.ok || !zkeyResponse.ok || !vkeyResponse.ok) {
      throw new Error("Failed to load circuit files from public directory");
    }

    const [wasmBuffer, zkeyBuffer, vkeyData] = await Promise.all([
      wasmResponse.arrayBuffer(),
      zkeyResponse.arrayBuffer(),
      vkeyResponse.json(),
    ]);

    console.log("✅ Circuit files loaded successfully");

    return {
      wasmFile: new Uint8Array(wasmBuffer),
      zkeyFile: new Uint8Array(zkeyBuffer),
      vkeyData,
    };
  } catch (error) {
    console.error("❌ Failed to load circuit files:", error);
    throw new Error(
      "Circuit files not found in public directory. Please ensure circuit files are in /public/circuits/",
    );
  }
};

// ============ UTILITY FUNCTIONS ============

function padArray(arr: bigint[], length: number): bigint[] {
  if (arr.length >= length) return arr;
  return [...arr, ...Array(length - arr.length).fill(BigInt(0))];
}

// ============ WITHDRAWAL PROOF GENERATOR ============

export class WithdrawalProofGenerator {
  private circuitFiles: CircuitFiles | null = null;
  private hash: (a: bigint, b: bigint) => bigint;

  constructor() {
    this.hash = (a: bigint, b: bigint) => poseidon2([a, b]);
  }

  private async ensureCircuitFiles(): Promise<CircuitFiles> {
    if (!this.circuitFiles) {
      this.circuitFiles = await loadCircuitFiles();
    }
    return this.circuitFiles;
  }

  /**
   * Generate a withdrawal proof using snarkjs
   */
  async generateWithdrawalProof(args: WithdrawalProofArgs): Promise<WithdrawalProofData> {
    console.log("🔧 Generating withdrawal proof...");

    // Ensure circuit files are loaded
    const circuitFiles = await this.ensureCircuitFiles();

    const {
      existingCommitmentHash,
      existingValue,
      existingNullifier,
      existingSecret,
      withdrawalValue,
      context,
      label,
      newNullifier,
      newSecret,
      stateTreeCommitments,
      aspTreeLabels,
    } = args;

    // Build Merkle trees
    const { stateTree, aspTree } = this.buildMerkleTrees(stateTreeCommitments, aspTreeLabels);
    // Find indices in trees
    const stateIndex = stateTreeCommitments.indexOf(existingCommitmentHash);
    const aspIndex = aspTreeLabels.indexOf(label);

    if (stateIndex === -1) {
      throw new Error("Existing commitment not found in state tree");
    }
    if (aspIndex === -1) {
      throw new Error("Commitment label not found in ASP tree");
    }
    // Generate Merkle proofs
    const stateProof = stateTree.generateProof(stateIndex);
    const aspProof = aspTree.generateProof(aspIndex);

    // Prepare circuit inputs
    const circuitInputs = this.prepareCircuitInputs({
      withdrawalValue,
      // Existing values
      existingValue,
      existingNullifier,
      existingSecret,
      context,
      label,
      // New values
      newNullifier,
      newSecret,
      // Proofs
      stateProof,
      aspProof,
      stateTreeDepth: stateTree.depth,
      ASPTreeDepth: aspTree.depth,
      stateIndex: Object.is(stateProof.index, Number.NaN) ? 0 : stateProof.index,
      aspIndex: Object.is(aspProof.index, Number.NaN) ? 0 : aspProof.index,
    });

    // Generate proof
    // For browser environment, pass Uint8Array directly (ZKArtifact = string | Uint8Array)
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInputs,
      circuitFiles.wasmFile,
      circuitFiles.zkeyFile,
    );

    // Verify proof
    const isValid = await this.verifyWithdrawalProof({ proof, publicSignals });

    if (!isValid) {
      throw new Error("Generated proof failed verification");
    }

    console.log("Withdrawal proof generated and verified!");
    return { proof, publicSignals };
  }

  /**
   * Verify a withdrawal proof
   */
  async verifyWithdrawalProof(proofData: WithdrawalProofData): Promise<boolean> {
    console.log("🔍 Verifying withdrawal proof...");

    try {
      const circuitFiles = await this.ensureCircuitFiles();
      const isValid = await snarkjs.groth16.verify(circuitFiles.vkeyData, proofData.publicSignals, proofData.proof);

      console.log(`   ${isValid ? "✅ Valid" : "❌ Invalid"} proof`);
      return isValid;
    } catch (error) {
      console.error("   ❌ Verification failed:", error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  // ============ PRIVATE METHODS ============

  private buildMerkleTrees(stateTreeCommitments: bigint[], aspTreeLabels: bigint[]) {
    // Build state tree
    const stateTree = new LeanIMT(this.hash);
    for (const commitment of stateTreeCommitments) {
      stateTree.insert(commitment);
    }

    // Build ASP tree
    const aspTree = new LeanIMT(this.hash);
    for (const label of aspTreeLabels) {
      aspTree.insert(label);
    }

    return { stateTree, aspTree };
  }

  private prepareCircuitInputs(params: {
    withdrawalValue: bigint;
    existingValue: bigint;
    existingNullifier: bigint;
    existingSecret: bigint;
    context: bigint;
    label: bigint;
    newNullifier: bigint;
    newSecret: bigint;
    stateProof: LeanIMTMerkleProof<bigint>;
    aspProof: LeanIMTMerkleProof<bigint>;
    stateTreeDepth: number;
    ASPTreeDepth: number;
    stateIndex: number;
    aspIndex: number;
  }) {
    const {
      withdrawalValue,
      existingValue,
      existingNullifier,
      existingSecret,
      context,
      label,
      newNullifier,
      newSecret,
      stateProof,
      aspProof,
      stateTreeDepth,
      ASPTreeDepth,
      stateIndex,
      aspIndex,
    } = params;

    return {
      withdrawnValue: withdrawalValue.toString(),
      stateRoot: stateProof.root.toString(),
      ASPRoot: aspProof.root.toString(),
      stateTreeDepth: stateTreeDepth.toString(),
      ASPTreeDepth: ASPTreeDepth.toString(),
      context: context.toString(),
      label: label.toString(),
      existingValue: existingValue.toString(),
      existingNullifier: existingNullifier.toString(),
      existingSecret: existingSecret.toString(),
      newNullifier: newNullifier.toString(),
      newSecret: newSecret.toString(),
      stateSiblings: padArray(stateProof.siblings, MAX_TREE_DEPTH).map((s) => s.toString()),
      ASPSiblings: padArray(aspProof.siblings, MAX_TREE_DEPTH).map((s) => s.toString()),
      stateIndex: stateIndex,
      ASPIndex: aspIndex,
    };
  }
}
