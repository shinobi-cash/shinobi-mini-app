/**
 * Indexer Service
 * 
 * Handles all interactions with The Graph indexer and IPFS for privacy pool data.
 * This includes GraphQL queries for blockchain data and IPFS fetching for ASP data.
 */

import { apolloClient } from '../lib/apollo';
import { CONTRACTS } from '../config/contracts';
import { INDEXER_CONSTANTS, IPFS_CONFIG } from '../config/constants';
import {
  GET_STATE_TREE_COMMITMENTS,
  GET_LATEST_ASP_ROOT,
  GET_DEPOSIT_BY_PRECOMMITMENT,
  CHECK_NULLIFIER_SPENT,
  GET_POOL_DEPOSITS,
  HEALTH_CHECK
} from '../config/queries';

// ============ TYPES ============

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

export interface DepositActivity {
  id: string;
  commitment: string;
  label: string;
  amount: string;
  timestamp: string;
  transactionHash: string;
  blockNumber: string;
  type: string;
  aspStatus: string;
}

// ============ STATE TREE QUERIES ============

/**
 * Fetch state tree commitments ordered by leafIndex in ascending order
 */
export async function fetchStateTreeLeaves(): Promise<StateTreeLeaf[]> {
  try {
    console.log('📊 Fetching state tree commitments...');
    
    const poolId = CONTRACTS.ETH_PRIVACY_POOL.toLowerCase();
    
    const result = await apolloClient.query({
      query: GET_STATE_TREE_COMMITMENTS,
      variables: { poolId },
      fetchPolicy: INDEXER_CONSTANTS.FETCH_POLICY,
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
      fetchPolicy: INDEXER_CONSTANTS.FETCH_POLICY,
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
    const ipfsResponse = await fetch(`${IPFS_CONFIG.GATEWAY_URL}${ipfsCID}`);
    
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

// ============ DEPOSIT AND ACTIVITY QUERIES ============

/**
 * Fetch deposit by precommitment hash
 */
export async function fetchDepositByPrecommitment(precommitmentHash: string): Promise<DepositActivity | null> {
  try {
    const result = await apolloClient.query({
      query: GET_DEPOSIT_BY_PRECOMMITMENT,
      variables: { precommitmentHash },
      fetchPolicy: INDEXER_CONSTANTS.FETCH_POLICY,
    });

    const activities = result.data?.activitys?.items || [];
    return activities.length > 0 ? activities[0] : null;

  } catch (error) {
    console.error('Failed to fetch deposit by precommitment:', error);
    return null;
  }
}

/**
 * Check if a nullifier is spent by looking for withdrawal activities
 */
export async function isNullifierSpent(nullifierHash: string): Promise<boolean> {
  try {
    const result = await apolloClient.query({
      query: CHECK_NULLIFIER_SPENT,
      variables: { nullifierHash },
      fetchPolicy: INDEXER_CONSTANTS.FETCH_POLICY,
    });

    const withdrawals = result.data?.activitys?.items || [];
    return withdrawals.length > 0;

  } catch (error) {
    console.error('Failed to check nullifier spent status:', error);
    throw new Error('Failed to check nullifier spent status');
  }
}

/**
 * Fetch all deposits for a specific pool
 */
export async function fetchPoolDeposits(poolAddress?: string): Promise<DepositActivity[]> {
  try {
    const poolId = (poolAddress || CONTRACTS.ETH_PRIVACY_POOL).toLowerCase();
    
    const result = await apolloClient.query({
      query: GET_POOL_DEPOSITS,
      variables: { poolId },
      fetchPolicy: INDEXER_CONSTANTS.FETCH_POLICY,
    });

    return result.data?.activitys?.items || [];

  } catch (error) {
    console.error('Failed to fetch pool deposits:', error);
    throw new Error('Failed to fetch pool deposits from indexer');
  }
}

/**
 * Check indexer health and connectivity
 */
export async function checkIndexerHealth(): Promise<boolean> {
  try {
    const result = await apolloClient.query({
      query: HEALTH_CHECK,
      fetchPolicy: INDEXER_CONSTANTS.FETCH_POLICY,
    });

    return !!result.data?._meta?.block;
  } catch (error) {
    console.error('Indexer health check failed:', error);
    return false;
  }
}