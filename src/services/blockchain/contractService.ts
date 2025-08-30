/**
 * Blockchain Contract Service
 *
 * Handles smart contract interactions and account abstraction:
 * - Privacy pool contract operations
 * - UserOperation preparation and execution
 * - Smart account client management
 * - Contract data encoding/decoding
 */

import { PRIVACY_POOL_ABI, PRIVACY_POOL_ENTRYPOINT_ABI } from "@/config/abis";
import { CONTRACTS, WITHDRAWAL_FEES } from "@/config/constants";
import type { SmartAccountClient } from "permissionless";
import { http, createPublicClient, encodeAbiParameters, encodeFunctionData } from "viem";
import { type UserOperation, entryPoint07Address } from "viem/account-abstraction";
import { baseSepolia } from "viem/chains";

// ============ TYPES ============

export interface WithdrawalData {
  processooor: `0x${string}`;
  data: `0x${string}`;
}

export interface WithdrawalProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}

export interface SmartAccountConfig {
  privateKey: `0x${string}`;
  bundlerUrl: string;
  paymasterAddress: string;
}

// ============ CONFIGURATION ============

// Create public client for contract calls
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// ============ POOL SCOPE OPERATIONS ============

/**
 * Fetch privacy pool scope via contract call
 */
export async function fetchPoolScope(): Promise<string> {
  try {
    console.log("⚙️ Fetching pool scope via contract call...");

    const scope = (await publicClient.readContract({
      address: CONTRACTS.ETH_PRIVACY_POOL as `0x${string}`,
      abi: PRIVACY_POOL_ABI,
      functionName: "SCOPE",
    })) as bigint;

    const scopeString = scope.toString();
    console.log(`✅ Pool scope fetched: ${scopeString}`);

    return scopeString;
  } catch (error) {
    console.error("Failed to fetch pool scope:", error);
    throw new Error("Failed to fetch pool scope from contract");
  }
}

// ============ WITHDRAWAL DATA ENCODING ============

/**
 * Create withdrawal data structure for context calculation
 */
export function createWithdrawalData(
  recipientAddress: string,
  feeRecipient: string,
  relayFeeBPS: bigint = WITHDRAWAL_FEES.DEFAULT_RELAY_FEE_BPS,
): readonly [`0x${string}`, `0x${string}`] {
  return [
    CONTRACTS.PRIVACY_POOL_ENTRYPOINT as `0x${string}`,
    encodeAbiParameters(
      [
        { type: "address", name: "recipient" },
        { type: "address", name: "feeRecipient" },
        { type: "uint256", name: "relayFeeBPS" },
      ],
      [recipientAddress as `0x${string}`, feeRecipient as `0x${string}`, relayFeeBPS],
    ),
  ] as const;
}

/**
 * Encode relay call data for privacy pool withdrawal
 */
export function encodeRelayCallData(
  withdrawalData: WithdrawalData,
  proof: WithdrawalProof,
  scope: bigint,
): `0x${string}` {
  return encodeFunctionData({
    abi: PRIVACY_POOL_ENTRYPOINT_ABI,
    functionName: "relay",
    args: [
      {
        processooor: withdrawalData.processooor,
        data: withdrawalData.data,
      },
      {
        pA: proof.pA,
        pB: proof.pB,
        pC: proof.pC,
        pubSignals: proof.pubSignals,
      },
      scope,
    ],
  });
}

/**
 * Format ZK proof from snarkjs format to contract format
 */
export function formatProofForContract(
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  },
  publicSignals: string[],
): WithdrawalProof {
  return {
    pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    pB: [
      // Swap coordinates for pi_b - this is required for compatibility between snarkjs and Solidity verifier
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],
    pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
    pubSignals: [
      BigInt(publicSignals[0]),
      BigInt(publicSignals[1]),
      BigInt(publicSignals[2]),
      BigInt(publicSignals[3]),
      BigInt(publicSignals[4]),
      BigInt(publicSignals[5]),
      BigInt(publicSignals[6]),
      BigInt(publicSignals[7]),
    ],
  };
}

/**
 * Prepare UserOperation for withdrawal
 */
export async function prepareWithdrawalUserOperation(
  smartAccountClient: SmartAccountClient,
  relayCallData: `0x${string}`,
): Promise<any> {
  try {
    console.log("📤 Preparing UserOperation for withdrawal...");

    const preparedUserOperation = await smartAccountClient.prepareUserOperation({
      account: smartAccountClient.account!,
      calls: [
        {
          to: CONTRACTS.PRIVACY_POOL_ENTRYPOINT as `0x${string}`,
          data: relayCallData,
          value: 0n,
        },
      ],
    });

    console.log("✅ UserOperation prepared successfully");
    console.log(`   Target: ${CONTRACTS.PRIVACY_POOL_ENTRYPOINT}`);
    console.log(`   Account: ${smartAccountClient.account?.address}`);

    return preparedUserOperation;
  } catch (error) {
    console.error("Failed to prepare UserOperation:", error);
    throw new Error("Failed to prepare UserOperation");
  }
}

/**
 * Execute withdrawal UserOperation
 */
export async function executeWithdrawalUserOperation(
  smartAccountClient: SmartAccountClient,
  userOperation: UserOperation,
): Promise<string> {
  try {
    console.log("🚀 Executing withdrawal UserOperation...");
    const signature = await smartAccountClient.account?.signUserOperation(userOperation);
    const userOpHash = await smartAccountClient.sendUserOperation({
      entryPointAddress: entryPoint07Address,
      ...userOperation,
      signature,
    });

    console.log(`✅ UserOperation sent with hash: ${userOpHash}`);

    // Wait for transaction to be mined
    console.log("⏳ Waiting for transaction to be mined...");
    const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash: userOpHash });

    console.log(`   Transaction hash: ${receipt.receipt.transactionHash}`);

    return receipt.receipt.transactionHash;
  } catch (error) {
    console.error("Failed to execute UserOperation:", error);
    throw new Error("Failed to execute withdrawal transaction");
  }
}
