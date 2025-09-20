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
import { pimlicoClient } from "@/lib/clients";
import type { SmartAccountClient } from "permissionless";
import { http, createPublicClient, encodeAbiParameters, encodeFunctionData } from "viem";
import { type UserOperation, entryPoint07Address } from "viem/account-abstraction";
import { arbitrumSepolia } from "viem/chains";

// ============ TYPES ============

export interface WithdrawalData {
  processooor: `0x${string}`;
  data: `0x${string}`;
}

export interface CrossChainWithdrawalData {
  processooor: `0x${string}`;
  data: `0x${string}`; // Encoded CrossChainRelayData
}

export interface CrossChainIntentParams {
  fillDeadline: number;
  expires: number;
  inputOracle: `0x${string}`;
  inputs: readonly [bigint, bigint][]; // [address, amount] pairs as readonly tuples
  outputs: {
    oracle: `0x${string}`;    // Oracle implementation for output chain
    settler: `0x${string}`;   // Output Settler on destination chain  
    chainId: bigint;
    token: `0x${string}`;     // Token address (bytes32 as hex string)
    amount: bigint;           // Amount to transfer
    recipient: `0x${string}`; // Recipient address (bytes32 as hex string)
    call: `0x${string}`;
    context: `0x${string}`;
  }[];
}

export interface WithdrawalProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}

export interface CrossChainWithdrawalProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]; // 9 signals
}

export interface SmartAccountConfig {
  privateKey: `0x${string}`;
  bundlerUrl: string;
  paymasterAddress: string;
}

// ============ CONFIGURATION ============

// Create public client for contract calls
const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
});

// ============ POOL SCOPE OPERATIONS ============

/**
 * Fetch privacy pool scope via contract call
 */
export async function fetchPoolScope(): Promise<string> {
  try {
    const scope = (await publicClient.readContract({
      address: CONTRACTS.ETH_PRIVACY_POOL as `0x${string}`,
      abi: PRIVACY_POOL_ABI,
      functionName: "SCOPE",
    })) as bigint;

    const scopeString = scope.toString();
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
) {
  try {
    if (!smartAccountClient.account) {
      throw new Error("Smart account not initialized");
    }
    const userOperationGasPrice = await pimlicoClient.getUserOperationGasPrice()
    const preparedUserOperation = await smartAccountClient.prepareUserOperation({
      account: smartAccountClient.account,
      calls: [
        {
          to: CONTRACTS.PRIVACY_POOL_ENTRYPOINT as `0x${string}`,
          data: relayCallData,
          value: 0n,
        },
      ],
      ...userOperationGasPrice.fast
    });

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
    const signature = await smartAccountClient.account?.signUserOperation(userOperation);
    const userOpHash = await smartAccountClient.sendUserOperation({
      entryPointAddress: entryPoint07Address,
      ...userOperation,
      signature,
    });

    const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash: userOpHash });
    return receipt.receipt.transactionHash;
  } catch (error) {
    console.error("Failed to execute UserOperation:", error);
    throw new Error("Failed to execute withdrawal transaction");
  }
}

// ============ CROSS-CHAIN WITHDRAWAL FUNCTIONS ============

/**
 * Create cross-chain withdrawal data structure
 */
export function createCrossChainWithdrawalData(
  recipientAddress: string,
  destinationChainId: number,
  feeRecipient: string,
  relayFeeBPS: bigint = WITHDRAWAL_FEES.DEFAULT_RELAY_FEE_BPS,
): readonly [`0x${string}`, `0x${string}`] {
  // Encode destination as chainId(32 bits) + recipient(160 bits)
  const encodedDestination = (BigInt(destinationChainId) << 224n) | BigInt(recipientAddress);
  
  return [
    CONTRACTS.PRIVACY_POOL_ENTRYPOINT as `0x${string}`,
    encodeAbiParameters(
      [
        { type: "address", name: "feeRecipient" },
        { type: "uint256", name: "relayFeeBPS" },
        { type: "bytes32", name: "encodedDestination" },
      ],
      [feeRecipient as `0x${string}`, relayFeeBPS, `0x${encodedDestination.toString(16).padStart(64, '0')}`],
    ),
  ] as const;
}

/**
 * Format ZK proof from snarkjs format to cross-chain contract format
 */
export function formatCrossChainProofForContract(
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  },
  publicSignals: string[],
): CrossChainWithdrawalProof {
  // Pass public signals in the exact order they come from the circuit:
  // [0] newCommitmentHash, [1] existingNullifierHash, [2] refundCommitmentHash, 
  // [3] withdrawnValue, [4] stateRoot, [5] stateTreeDepth, [6] ASPRoot, [7] ASPTreeDepth, [8] context
  
  return {
    pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    pB: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],
    pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
    pubSignals: [
      BigInt(publicSignals[0]), // [0] newCommitmentHash
      BigInt(publicSignals[1]), // [1] existingNullifierHash
      BigInt(publicSignals[2]), // [2] refundCommitmentHash
      BigInt(publicSignals[3]), // [3] withdrawnValue
      BigInt(publicSignals[4]), // [4] stateRoot
      BigInt(publicSignals[5]), // [5] stateTreeDepth
      BigInt(publicSignals[6]), // [6] ASPRoot
      BigInt(publicSignals[7]), // [7] ASPTreeDepth
      BigInt(publicSignals[8]), // [8] context
    ],
  };
}

/**
 * Encode cross-chain withdrawal call data
 */
export function encodeCrossChainWithdrawalCallData(
  withdrawalData: CrossChainWithdrawalData,
  proof: CrossChainWithdrawalProof,
  scope: bigint,
  intentParams: CrossChainIntentParams,
): `0x${string}` {
  return encodeFunctionData({
    abi: [
      {
        name: "processCrossChainWithdrawal",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          {
            name: "withdrawal",
            type: "tuple",
            components: [
              { name: "processooor", type: "address" },
              { name: "data", type: "bytes" }
            ]
          },
          {
            name: "proof",
            type: "tuple", 
            components: [
              { name: "pA", type: "uint256[2]" },
              { name: "pB", type: "uint256[2][2]" },
              { name: "pC", type: "uint256[2]" },
              { name: "pubSignals", type: "uint256[9]" }
            ]
          },
          { name: "scope", type: "uint256" },
          {
            name: "intentParams",
            type: "tuple",
            components: [
              { name: "fillDeadline", type: "uint32" },
              { name: "expires", type: "uint32" },
              { name: "inputOracle", type: "address" },
              { name: "inputs", type: "uint256[2][]" },
              { 
                name: "outputs", 
                type: "tuple[]",
                components: [
                  { name: "oracle", type: "bytes32" },
                  { name: "settler", type: "bytes32" },
                  { name: "chainId", type: "uint256" },
                  { name: "token", type: "bytes32" },
                  { name: "amount", type: "uint256" },
                  { name: "recipient", type: "bytes32" },
                  { name: "call", type: "bytes" },
                  { name: "context", type: "bytes" }
                ]
              }
            ]
          }
        ]
      }
    ],
    functionName: "processCrossChainWithdrawal",
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
      intentParams
    ],
  });
}

/**
 * Prepare UserOperation for cross-chain withdrawal
 */
export async function prepareCrossChainWithdrawalUserOperation(
  smartAccountClient: SmartAccountClient,
  crossChainCallData: `0x${string}`,
) {
  try {
    if (!smartAccountClient.account) {
      throw new Error("Smart account not initialized");
    }
    const userOperationGasPrice = await pimlicoClient.getUserOperationGasPrice()
    const preparedUserOperation = await smartAccountClient.prepareUserOperation({
      account: smartAccountClient.account,
      calls: [
        {
          to: CONTRACTS.PRIVACY_POOL_ENTRYPOINT as `0x${string}`,
          data: crossChainCallData,
          value: 0n,
        },
      ],
      ...userOperationGasPrice.fast
    });

    return preparedUserOperation;
  } catch (error) {
    console.error("Failed to prepare cross-chain UserOperation:", error);
    throw new Error("Failed to prepare cross-chain UserOperation");
  }
}
