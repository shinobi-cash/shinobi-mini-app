/**
 * Data Query Service
 * 
 * Centralized GraphQL and IPFS data fetching service.
 * Handles all blockchain data queries through The Graph indexer.
 */

import { apolloClient } from '@/lib/clients';
import { INDEXER_FETCH_POLICY, IPFS_GATEWAY_URL, CONTRACTS } from '@/config/constants';
import { apiQueue } from '@/lib/apiQueue';
import {
  GET_ACTIVITIES,
  GET_STATE_TREE_COMMITMENTS,
  GET_LATEST_ASP_ROOT,
  GET_APPROVED_LABELS,
  GET_POOL_CONFIG,
  GET_POOL_STATS,
  HEALTH_CHECK,
} from '@/config/queries';

// ============ CONSTANTS ============

const DEFAULT_LIMIT = 100;

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

export type ActivityType = 'DEPOSIT' | 'WITHDRAWAL' | 'RAGEQUIT'
export type ActivityStatus = 'pending' | 'approved' | 'rejected'

// Simplified Activity interface (matches indexer data structure)
export interface Activity {
  id: string
  type: ActivityType
  aspStatus: ActivityStatus
  poolId: string
  user: string
  recipient?: string | null
  amount: string // bigint as string from GraphQL
  originalAmount?: string | null // bigint as string (deposits only)
  vettingFeeAmount?: string | null // bigint as string (deposits only)
  commitment: string // bigint as string
  label?: string | null // bigint as string
  precommitmentHash?: string | null // bigint as string
  spentNullifier?: string | null // bigint as string
  newCommitment?: string | null // bigint as string
  feeAmount?: string | null // bigint as string
  feeRefund?: string | null // bigint as string
  relayer?: string | null
  isSponsored: boolean
  blockNumber: string // bigint as string
  timestamp: string // bigint as string
  transactionHash: string
}

// ============ ACTIVITY QUERIES ============

/**
 * Get all activities with pagination support
 */
export async function fetchActivities(poolAddress?: string, limit: number = DEFAULT_LIMIT, after?: string, orderDirection: string = "desc") {
   return apiQueue.submit(async () => {
      const poolId = (poolAddress || CONTRACTS.ETH_PRIVACY_POOL).toLowerCase();
      
      const result = await apolloClient.query({
        query: GET_ACTIVITIES,
        variables: { poolId, limit, after, orderDirection },
        fetchPolicy: INDEXER_FETCH_POLICY,
      });
      
      return result.data?.activitys || { items: [], pageInfo: {} };
  });
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
 * Fetch all state tree commitments ordered by leafIndex (with pagination)
 */
export async function fetchStateTreeLeaves(poolId: string, limit: number = DEFAULT_LIMIT): Promise<StateTreeLeaf[]> {
  try {
    console.log('📊 Fetching state tree commitments...');
    
    let allLeaves: StateTreeLeaf[] = [];
    let cursor: string | undefined;
    let hasNext = true;
    
    while (hasNext) {
      const result = await apolloClient.query({
        query: GET_STATE_TREE_COMMITMENTS,
        variables: { poolId, limit, after: cursor },
        fetchPolicy: INDEXER_FETCH_POLICY,
      });

      const pageLeaves = result.data?.merkleTreeLeafs?.items || [];
      const pageInfo = result.data?.merkleTreeLeafs?.pageInfo;
      
      // Add leaves from this page
      allLeaves.push(...pageLeaves.map((leaf: any) => ({
        leafIndex: leaf.leafIndex,
        leafValue: leaf.leafValue,
      })));
      
      // Check if there are more pages
      hasNext = !!pageInfo?.hasNextPage;
      cursor = pageInfo?.endCursor;
      
      console.log(`📄 Fetched page: ${pageLeaves.length} leaves, total: ${allLeaves.length}`);
    }
    
    console.log(`✅ All state tree leaves fetched: ${allLeaves.length} leaves`);
    
    return allLeaves;

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