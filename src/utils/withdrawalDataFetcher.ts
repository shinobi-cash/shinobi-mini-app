import { BUNDLER_URL } from '../config/constants';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createSmartAccountClient } from "permissionless";
import { entryPoint07Address } from 'viem/account-abstraction';
import { CONTRACTS } from '@/config/constants';
// Re-export types and functions from query service
export type { StateTreeLeaf, ASPApprovalList, ASPData } from '../services/queryService';
export { fetchStateTreeLeaves, fetchASPData } from '../services/queryService';

// Minimal Privacy Pool ABI for SCOPE function
const PRIVACY_POOL_ABI = [
  {
    inputs: [],
    name: "SCOPE",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Create public client for contract calls
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const WITHDRAWAL_ACCOUNT_PRIVATE_KEY= "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`

// Note: fetchStateTreeLeaves and fetchASPData are now imported from queryService

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

export async function getWithdrawalSmartAccountClient(){
  const account = privateKeyToAccount(WITHDRAWAL_ACCOUNT_PRIVATE_KEY);

  const simpleAccount = await toSimpleSmartAccount({
        owner: account as any,
        client: publicClient as any,
        entryPoint: { address: entryPoint07Address, version: "0.7" },
    });

    const smartAccountClient = createSmartAccountClient({
      client: publicClient as any,
      account: simpleAccount,
      bundlerTransport: http(BUNDLER_URL) as any,
      paymaster: {
          // Provide stub data for gas estimation - just hardcode high gas values
          async getPaymasterStubData() {
              return {
                  paymaster: CONTRACTS.PAYMASTER as `0x${string}`,
                  paymasterData: "0x" as `0x${string}`, // Empty paymaster data
                  paymasterPostOpGasLimit: 35000n, // Above the 32,000 minimum
              };
          },
          // Provide real paymaster data for actual transaction
          async getPaymasterData() {
              return {
                  paymaster: CONTRACTS.PAYMASTER as `0x${string}`,
                  paymasterData: "0x" as `0x${string}`, // Empty - paymaster validates via callData
                  paymasterPostOpGasLimit: 35000n, // Above the 32,000 minimum
              };
          },
      },
  });
  return smartAccountClient;
}