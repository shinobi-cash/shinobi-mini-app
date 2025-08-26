/**
 * Data Query Service
 * 
 * Centralized GraphQL and IPFS data fetching service.
 * Handles all blockchain data queries through The Graph indexer.
 */

import { apolloClient } from '@/lib/clients';
import { INDEXER_FETCH_POLICY, IPFS_GATEWAY_URL, CONTRACTS } from '@/config/constants';
import { queuedRequest } from '@/lib/apiQueue';
import {
  GET_ACTIVITIES,
  GET_STATE_TREE_COMMITMENTS,
  GET_LATEST_ASP_ROOT,
  GET_APPROVED_LABELS,
  GET_DEPOSIT_BY_PRECOMMITMENT,
  CHECK_NULLIFIER_SPENT,
  FETCH_WITHDRAWAL_BY_SPENT_NULLIFIER,
  GET_POOL_DEPOSITS,
  GET_POOL_CONFIG,
  GET_POOL_STATS,
  HEALTH_CHECK,
} from '@/config/queries';

// ============ TYPES ============

export interface StateTreeLeaf {
  leafIndex: string;
  leafValue: string;
}

export interface ASPApprovalList {
  version: '1.0';
  poolId: string;
  cumulativeApprovedLabels: string[];
  aspRoot: string;
  timestamp: number;
  description: string;
}

export interface ASPData {
  aspRoot: string;
  ipfsCID: string;
  approvedLabels: string[];
}

export interface Activity {
  id: string;
  type: string;
  aspStatus: string;
  poolId: string;
  user: string;
  recipient?: string;
  amount: string;
  originalAmount?: string;
  vettingFeeAmount?: string;
  commitment?: string;
  label?: string;
  precommitmentHash?: string;
  spentNullifier?: string;
  newCommitment?: string;
  feeAmount?: string;
  relayer?: string;
  isSponsored?: boolean;
  blockNumber: string;
  timestamp: string;
  transactionHash: string;
}

// ============ ACTIVITY QUERIES ============

/**
 * Get all activities with pagination support
 */
export async function fetchActivities(limit: number = 15, after?: string) {
  const result = await apolloClient.query({
    query: GET_ACTIVITIES,
    variables: { limit, after },
    fetchPolicy: INDEXER_FETCH_POLICY,
  });
  
  return result.data?.activitys || { items: [], pageInfo: {} };
}

/**
 * Fetch deposit by precommitment hash for specific note data
 */
export async function fetchDepositByPrecommitment(precommitmentHash: string): Promise<Activity | null> {
  return queuedRequest(async () => {
    console.log(`[Discovery] Fetching deposit by precommitment: ${precommitmentHash.substring(0, 10)}...`);
    try {
      const result = await apolloClient.query({
        query: GET_DEPOSIT_BY_PRECOMMITMENT,
        variables: { precommitmentHash },
        fetchPolicy: INDEXER_FETCH_POLICY,
      });
      
      const deposit = result.data?.activitys?.items?.[0] || null;
      if (deposit) {
        console.log(`[Discovery] ✅ Found deposit: amount=${deposit.amount}, blockNumber=${deposit.blockNumber}`);
      } else {
        console.log(`[Discovery] ❌ No deposit found for precommitment`);
      }
      return deposit;
    } catch (error) {
      console.error('Failed to fetch deposit by precommitment:', error);
      return null;
    }
  });
}

/**
 * Check if nullifier has been spent in a withdrawal
 */
export async function isNullifierSpent(spentNullifier: string): Promise<boolean> {
  return queuedRequest(async () => {
    try {
      const result = await apolloClient.query({
        query: CHECK_NULLIFIER_SPENT,
        variables: { spentNullifier },
        fetchPolicy: INDEXER_FETCH_POLICY,
      });
      
      return result.data?.activitys?.items?.length > 0;
    } catch (error) {
      console.error('Failed to check withdrawal by nullifier:', error);
      // On error, assume not spent to avoid marking valid deposits as spent
      return false;
    }
  });
}

/**
 * Fetch withdrawal activity by spent nullifier (for discovering change notes)
 */
export async function fetchWithdrawalBySpentNullifier(spentNullifier: string): Promise<any | null> {
  return queuedRequest(async () => {
    console.log(`[Discovery] Checking withdrawal by spent nullifier: ${spentNullifier.substring(0, 10)}...`);
    try {
      const result = await apolloClient.query({
        query: FETCH_WITHDRAWAL_BY_SPENT_NULLIFIER,
        variables: { spentNullifier },
        fetchPolicy: INDEXER_FETCH_POLICY,
      });
      
      const activities = result.data?.activitys?.items || [];
      const withdrawal = activities.length > 0 ? activities[0] : null;
      if (withdrawal) {
        console.log(`[Discovery] ✅ Found withdrawal: amount=${withdrawal.amount}, newCommitment=${withdrawal.newCommitment ? 'Yes' : 'No'}`);
      } else {
        console.log(`[Discovery] ❌ No withdrawal found - note remains unspent`);
      }
      return withdrawal;
    } catch (error) {
      console.error('Failed to fetch withdrawal by nullifier:', error);
      return null;
    }
  });
}

/**
 * Fetch all deposits for a specific pool
 */
export async function fetchPoolDeposits(poolAddress?: string): Promise<Activity[]> {
  try {
    const poolId = (poolAddress || CONTRACTS.ETH_PRIVACY_POOL).toLowerCase();
    
    const result = await apolloClient.query({
      query: GET_POOL_DEPOSITS,
      variables: { poolId },
      fetchPolicy: INDEXER_FETCH_POLICY,
    });

    return result.data?.activitys?.items || [];

  } catch (error) {
    console.error('Failed to fetch pool deposits:', error);
    throw new Error('Failed to fetch pool deposits from indexer');
  }
}

/**
 * Fetch pool statistics (total deposits, withdrawals, member count)
 */
export async function fetchPoolStats(poolAddress?: string): Promise<{
  totalDeposits: string;
  totalWithdrawals: string;
  memberCount: number;
  createdAt: string;
} | null> {
  try {
    const poolId = (poolAddress || CONTRACTS.ETH_PRIVACY_POOL).toLowerCase();
    
    const result = await apolloClient.query({
      query: GET_POOL_STATS,
      variables: { poolId },
      fetchPolicy: INDEXER_FETCH_POLICY,
    });

    return result.data?.pool || null;

  } catch (error) {
    console.error('Failed to fetch pool stats:', error);
    return null;
  }
}

// ============ STATE TREE QUERIES ============

/**
 * Fetch state tree commitments ordered by leafIndex
 */
export async function fetchStateTreeLeaves(): Promise<StateTreeLeaf[]> {
  try {
    console.log('📊 Fetching state tree commitments...');
    
    const poolId = CONTRACTS.ETH_PRIVACY_POOL.toLowerCase();
    
    const result = await apolloClient.query({
      query: GET_STATE_TREE_COMMITMENTS,
      variables: { poolId },
      fetchPolicy: INDEXER_FETCH_POLICY,
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

// ============ ASP (APPROVED SET OF PARTICIPANTS) QUERIES ============

/**
 * Fetch latest ASP root and IPFS CID from indexer
 */
export async function fetchLatestASPRoot(): Promise<{ root: string; ipfsCID: string; timestamp: string }> {
  try {
    console.log('🌳 Fetching latest ASP root...');
    
    const result = await apolloClient.query({
      query: GET_LATEST_ASP_ROOT,
      fetchPolicy: INDEXER_FETCH_POLICY,
    });

    const latestUpdate = result.data?.associationSetUpdates?.items?.[0];
    
    if (!latestUpdate?.root || !latestUpdate?.ipfsCID) {
      throw new Error('No ASP root found or missing IPFS CID');
    }

    console.log(`✅ Latest ASP root found: ${latestUpdate.root}`);
    console.log(`📎 IPFS CID: ${latestUpdate.ipfsCID}`);

    return {
      root: latestUpdate.root,
      ipfsCID: latestUpdate.ipfsCID,
      timestamp: latestUpdate.timestamp
    };

  } catch (error) {
    console.error('Failed to fetch latest ASP root:', error);
    throw new Error('Failed to fetch ASP root from indexer');
  }
}

/**
 * Fetch approved labels from IPFS using CID
 */
export async function fetchApprovedLabelsFromIPFS(ipfsCID: string): Promise<string[]> {
  try {
    console.log('🏷️ Fetching approved labels from IPFS...');
    const ipfsResponse = await fetch(`${IPFS_GATEWAY_URL}${ipfsCID}`);
    
    if (!ipfsResponse.ok) {
      throw new Error(`IPFS fetch failed: ${ipfsResponse.status} ${ipfsResponse.statusText}`);
    }
    
    const approvalList = await ipfsResponse.json() as ASPApprovalList;
    
    // Validate the approval list structure
    if (!approvalList.cumulativeApprovedLabels || !Array.isArray(approvalList.cumulativeApprovedLabels)) {
      throw new Error('Invalid approval list format: missing cumulativeApprovedLabels array');
    }
    
    const approvedLabels = approvalList.cumulativeApprovedLabels;
    console.log(`✅ Approved labels fetched from IPFS: ${approvedLabels.length} labels`);
    
    return approvedLabels;

  } catch (error) {
    console.error('Failed to fetch approved labels from IPFS:', error);
    throw new Error('Failed to fetch approved labels from IPFS');
  }
}

/**
 * Get approved labels directly from indexer (fallback method)
 */
export async function fetchApprovedLabelsFromIndexer(): Promise<string[]> {
  try {
    const result = await apolloClient.query({
      query: GET_APPROVED_LABELS,
      fetchPolicy: INDEXER_FETCH_POLICY,
    });

    const activities = result.data?.activitys?.items || [];
    return activities.map((activity: any) => activity.label);
  } catch (error) {
    console.error('Failed to fetch approved labels from indexer:', error);
    return [];
  }
}

/**
 * Fetch complete ASP data (root + approved labels from IPFS)
 */
export async function fetchASPData(): Promise<ASPData> {
  try {
    // Step 1: Get latest ASP root and IPFS CID
    const { root: aspRoot, ipfsCID } = await fetchLatestASPRoot();
    
    // Step 2: Fetch approval list from IPFS
    const approvedLabels = await fetchApprovedLabelsFromIPFS(ipfsCID);
    
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

// ============ POOL QUERIES ============

/**
 * Get pool configuration and stats
 */
export async function fetchPoolConfig(poolId: string) {
  try {
    const result = await apolloClient.query({
      query: GET_POOL_CONFIG,
      variables: { poolId },
      fetchPolicy: INDEXER_FETCH_POLICY,
    });

    return result.data?.pool || null;
  } catch (error) {
    console.error('Failed to fetch pool config:', error);
    return null;
  }
}

// ============ HEALTH AND META QUERIES ============

/**
 * Check indexer health and connectivity
 */
export async function checkIndexerHealth(): Promise<boolean> {
  try {
    const result = await apolloClient.query({
      query: HEALTH_CHECK,
      fetchPolicy: INDEXER_FETCH_POLICY,
    });

    return !!result.data?._meta?.status;
  } catch (error) {
    console.error('Indexer health check failed:', error);
    return false;
  }
}

/**
 * Get latest indexed block from Ponder meta status
 */
export async function fetchLatestIndexedBlock(): Promise<{
  blockNumber: string;
  timestamp: string;
} | null> {
  try {
    const result = await apolloClient.query({
      query: HEALTH_CHECK,
      fetchPolicy: INDEXER_FETCH_POLICY,
    });

    const status = result.data?._meta?.status;
    if (!status) {
      return null;
    }

    // Find the first chain with block data
    // Since we don't know the exact chain name, get the first available one
    for (const chainName of Object.keys(status)) {
      const chainStatus = status[chainName];
      if (chainStatus?.block) {
        return {
          blockNumber: chainStatus.block.number.toString(),
          timestamp: chainStatus.block.timestamp.toString(),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch latest indexed block:', error);
    return null;
  }
}