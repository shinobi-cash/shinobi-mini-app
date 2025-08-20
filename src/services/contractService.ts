/**
 * Contract Service
 * 
 * Handles all blockchain contract interactions including:
 * - Privacy pool contract calls
 * - Account abstraction setup
 * - Smart account client creation
 * - Contract parameter fetching
 */

import { createPublicClient, http, encodeAbiParameters, encodeFunctionData } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createSmartAccountClient, SmartAccountClient } from "permissionless";
import { entryPoint07Address, UserOperation } from 'viem/account-abstraction';
import { BUNDLER_URL } from '../config/constants';
import { PRIVACY_POOL_ABI, PRIVACY_POOL_ENTRYPOINT_ABI } from '../config/abis';
import { WITHDRAWAL_ACCOUNT_PRIVATE_KEY, WITHDRAWAL_FEES, GAS_LIMITS, CONTRACTS } from '../config/constants';

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
    console.log('⚙️ Fetching pool scope via contract call...');
    
    const scope = await publicClient.readContract({
      address: CONTRACTS.ETH_PRIVACY_POOL as `0x${string}`,
      abi: PRIVACY_POOL_ABI,
      functionName: "SCOPE",
    }) as bigint;

    const scopeString = scope.toString();
    console.log(`✅ Pool scope fetched: ${scopeString}`);
    
    return scopeString;

  } catch (error) {
    console.error('Failed to fetch pool scope:', error);
    throw new Error('Failed to fetch pool scope from contract');
  }
}

// ============ WITHDRAWAL DATA ENCODING ============

/**
 * Create withdrawal data structure for context calculation
 */
export function createWithdrawalData(
  recipientAddress: string,
  feeRecipient: string,
  relayFeeBPS: bigint = WITHDRAWAL_FEES.DEFAULT_RELAY_FEE_BPS
): readonly [`0x${string}`, `0x${string}`] {
  return [
    CONTRACTS.PRIVACY_POOL_ENTRYPOINT as `0x${string}`,
    encodeAbiParameters(
      [
        { type: "address", name: "recipient" },
        { type: "address", name: "feeRecipient" },
        { type: "uint256", name: "relayFeeBPS" },
      ],
      [recipientAddress as `0x${string}`, feeRecipient as `0x${string}`, relayFeeBPS]
    ),
  ] as const;
}

/**
 * Encode relay call data for privacy pool withdrawal
 */
export function encodeRelayCallData(
  withdrawalData: WithdrawalData,
  proof: WithdrawalProof,
  scope: bigint
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
export function formatProofForContract(proof: {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}, publicSignals: string[]): WithdrawalProof {
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

// ============ ACCOUNT ABSTRACTION SETUP ============

/**
 * Create smart account client for withdrawal operations
 */
export async function createWithdrawalSmartAccountClient(
  config?: Partial<SmartAccountConfig>
): Promise<any> {
  const privateKey = config?.privateKey || WITHDRAWAL_ACCOUNT_PRIVATE_KEY;
  const bundlerUrl = config?.bundlerUrl || BUNDLER_URL;
  const paymasterAddress = (config?.paymasterAddress || CONTRACTS.PAYMASTER) as `0x${string}`;

  try {
    console.log('🔑 Creating smart account client...');
    
    const account = privateKeyToAccount(privateKey);

    const simpleAccount = await toSimpleSmartAccount({
      owner: account as any,
      client: publicClient as any,
      entryPoint: { address: entryPoint07Address, version: "0.7" },
    });

    const smartAccountClient = createSmartAccountClient({
      client: publicClient,
      account: simpleAccount,
      bundlerTransport: http(bundlerUrl) ,
      paymaster: {
        // Provide stub data for gas estimation
        async getPaymasterStubData() {
          return {
            paymaster: paymasterAddress,
            paymasterData: "0x" as `0x${string}`,
            paymasterPostOpGasLimit: GAS_LIMITS.PAYMASTER_POST_OP_GAS_LIMIT,
          };
        },
        // Provide real paymaster data for actual transaction
        async getPaymasterData() {
          return {
            paymaster: paymasterAddress,
            paymasterData: "0x" as `0x${string}`,
            paymasterPostOpGasLimit: GAS_LIMITS.PAYMASTER_POST_OP_GAS_LIMIT,
          };
        },
      },
    });

    console.log(`✅ Smart account client created`);
    console.log(`   Account address: ${simpleAccount.address}`);
    console.log(`   Paymaster: ${paymasterAddress}`);
    
    return smartAccountClient;

  } catch (error) {
    console.error('Failed to create smart account client:', error);
    throw new Error('Failed to create smart account client');
  }
}

/**
 * Prepare UserOperation for withdrawal
 */
export async function prepareWithdrawalUserOperation(
  smartAccountClient: SmartAccountClient,
  relayCallData: `0x${string}`
): Promise<any> {
  try {
    console.log('📤 Preparing UserOperation for withdrawal...');
    
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

    console.log('✅ UserOperation prepared successfully');
    console.log(`   Target: ${CONTRACTS.PRIVACY_POOL_ENTRYPOINT}`);
    console.log(`   Account: ${smartAccountClient.account!.address}`);
    
    return preparedUserOperation;

  } catch (error) {
    console.error('Failed to prepare UserOperation:', error);
    throw new Error('Failed to prepare UserOperation');
  }
}

/**
 * Execute withdrawal UserOperation
 */
export async function executeWithdrawalUserOperation(
  smartAccountClient: SmartAccountClient,
  userOperation: UserOperation
): Promise<string> {
  try {
    console.log('🚀 Executing withdrawal UserOperation...');
    const signature = await smartAccountClient.account?.signUserOperation(userOperation);
    const userOpHash = await smartAccountClient.sendUserOperation({
        entryPointAddress: entryPoint07Address,
        ...userOperation,
        signature,
    });
    
    console.log(`✅ UserOperation sent with hash: ${userOpHash}`);
    
    // Wait for transaction to be mined
    console.log('⏳ Waiting for transaction to be mined...');
    const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash: userOpHash });
    
    console.log(`   Transaction hash: ${receipt.receipt.transactionHash}`);
    
    return receipt.receipt.transactionHash;

  } catch (error) {
    console.error('Failed to execute UserOperation:', error);
    throw new Error('Failed to execute withdrawal transaction');
  }
}

