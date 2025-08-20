import { apolloClient } from '../lib/apollo';
import { gql } from '@apollo/client';
import { BUNDLER_URL, CONTRACTS } from '../config/contracts';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createSmartAccountClient } from "permissionless";
import { entryPoint07Address } from 'viem/account-abstraction';

export interface StateTreeLeaf {
  leafIndex: string;
  leafValue: string;
}

export interface ASPApprovalList {
  version: '1.0';
  poolId: string;
  cumulativeApprovedLabels: string[]; // All approved labels in insertion order
  aspRoot: string; // The calculated ASP merkle root
  timestamp: number;
  description: string;
}

export interface ASPData {
  aspRoot: string;
  ipfsCID: string;
  approvedLabels: string[];
}

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

/**
 * Fetch state tree commitments ordered by leafIndex in ascending order
 */
export async function fetchStateTreeLeaves(): Promise<StateTreeLeaf[]> {
  try {
    console.log('📊 Fetching state tree commitments...');
    
    const poolId = CONTRACTS.ETH_PRIVACY_POOL.toLowerCase();
    
    const result = await apolloClient.query({
      query: gql`
        query GetStateTreeCommitments($poolId: String!) {
          merkleTreeLeafs(
            where: { poolId: $poolId }
            orderBy: "leafIndex"
            orderDirection: "asc"
          ) {
            items {
              leafIndex
              leafValue
              treeRoot
              treeSize
            }
          }
        }
      `,
      variables: { poolId },
      fetchPolicy: 'network-only',
    });

    const stateTreeLeaves = result.data?.merkleTreeLeafs?.items || [];
    
    console.log(`✅ State tree leaves fetched: ${stateTreeLeaves.length} leaves`);
    
    return stateTreeLeaves.map((leaf: any) => ({
      leafIndex: leaf.leafIndex,
      leafValue: leaf.leafValue,
    }));

  } catch (error) {
    console.error('Failed to fetch state tree leaves:', error);
    throw new Error('Failed to fetch state tree data from indexer');
  }
}

/**
 * Fetch latest ASP root and approved labels from IPFS
 */
export async function fetchASPData(): Promise<ASPData> {
  try {
    console.log('🌳 Fetching latest ASP root...');
    
    // Step 1: Get latest ASP root and IPFS CID from indexer
    const result = await apolloClient.query({
      query: gql`
        query GetLatestAspRoot {
          associationSetUpdates(
            orderBy: "timestamp"
            orderDirection: "desc"
            limit: 1
          ) {
            items {
              root
              ipfsCID
              timestamp
            }
          }
        }
      `,
      fetchPolicy: 'network-only',
    });

    const latestUpdate = result.data?.associationSetUpdates?.items?.[0];
    
    if (!latestUpdate?.root || !latestUpdate?.ipfsCID) {
      throw new Error('No ASP root found or missing IPFS CID');
    }

    const { root: aspRoot, ipfsCID } = latestUpdate;
    console.log(`✅ Latest ASP root found: ${aspRoot}`);
    console.log(`📎 IPFS CID: ${ipfsCID}`);

    // Step 2: Fetch approval list from IPFS
    console.log('🏷️ Fetching approved labels from IPFS...');
    const ipfsResponse = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsCID}`);
    
    if (!ipfsResponse.ok) {
      throw new Error(`IPFS fetch failed: ${ipfsResponse.status} ${ipfsResponse.statusText}`);
    }
    
    const approvalList = await ipfsResponse.json() as ASPApprovalList;
    
    // Validate the approval list structure
    if (!approvalList.cumulativeApprovedLabels || !Array.isArray(approvalList.cumulativeApprovedLabels)) {
      throw new Error('Invalid approval list format: missing cumulativeApprovedLabels array');
    }
    
    const approvedLabels = approvalList.cumulativeApprovedLabels;
    console.log(`✅ ASP data fetched: ${approvedLabels.length} approved labels`);
    
    return {
      aspRoot,
      ipfsCID,
      approvedLabels,
    };

  } catch (error) {
    console.error('Failed to fetch ASP data:', error);
    throw new Error('Failed to fetch ASP data from indexer and IPFS');
  }
}

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