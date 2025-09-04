/**
 * Indexer Service
 */

import { CONTRACTS, IPFS_GATEWAY_URL } from "@/config/constants";
import { indexerClient } from "@/lib/indexer/client";

// ============ LOCAL TYPES ============

export type ActivityType = "DEPOSIT" | "WITHDRAWAL" | "RAGEQUIT";
export type ActivityStatus = "pending" | "approved" | "rejected";

// ============ LEGACY COMPATIBILITY TYPES ============

// Legacy interface for compatibility
export interface ASPApprovalListLegacy {
  version: "1.0";
  poolId: string;
  cumulativeApprovedLabels: string[];
  aspRoot: string;
  timestamp: number;
  description: string;
}

// ============ ACTIVITY QUERIES ============

/**
 * Get all activities with pagination support
 * Uses the Shinobi Indexer SDK consistently
 */
export async function fetchActivities(
  poolAddress?: string,
  limit = 100,
  after?: string,
  orderDirection: "asc" | "desc" = "desc",
) {
  try {
    const poolId = (poolAddress || CONTRACTS.ETH_PRIVACY_POOL).toLowerCase();

    const result = await indexerClient.getActivities({
      poolId,
      limit,
      after,
      orderDirection,
    });

    return result;
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    throw error;
  }
}

// ============ STATE TREE QUERIES ============

/**
 * Fetch all state tree commitments ordered by leafIndex (with automatic pagination)
 * Uses SDK client which handles pagination internally
 */
export async function fetchStateTreeLeaves(poolId: string) {
  try {
    // Use SDK's built-in method that handles pagination automatically
    const allLeaves = await indexerClient.getAllStateTreeLeaves(poolId);

    return allLeaves.map((leaf) => ({
      leafIndex: leaf.leafIndex,
      leafValue: leaf.leafValue,
    }));
  } catch (error) {
    console.error("Failed to fetch state tree leaves:", error);
    throw new Error("Failed to fetch state tree data from indexer");
  }
}

// ============ ASP (APPROVED SET OF PARTICIPANTS) QUERIES ============

/**
 * Fetch latest ASP root and IPFS CID from indexer
 * Uses SDK client for simplified implementation
 */
export async function fetchLatestASPRoot(): Promise<{ root: string; ipfsCID: string; timestamp: string }> {
  try {
    const latestUpdate = await indexerClient.getLatestASPRoot();

    if (!latestUpdate?.root || !latestUpdate?.ipfsCID) {
      throw new Error("No ASP root found or missing IPFS CID");
    }

    return {
      root: latestUpdate.root,
      ipfsCID: latestUpdate.ipfsCID,
      timestamp: latestUpdate.timestamp,
    };
  } catch (error) {
    console.error("Failed to fetch ASP root:", error);
    throw new Error("Failed to fetch ASP root from indexer");
  }
}

/**
 * Fetch approved labels from IPFS using CID
 * Direct IPFS fetch - no SDK equivalent needed
 */
export async function fetchApprovedLabelsFromIPFS(ipfsCID: string): Promise<string[]> {
  try {
    const ipfsResponse = await fetch(`${IPFS_GATEWAY_URL}${ipfsCID}`);

    if (!ipfsResponse.ok) {
      throw new Error(`IPFS fetch failed: ${ipfsResponse.status} ${ipfsResponse.statusText}`);
    }

    const approvalList = (await ipfsResponse.json()) as ASPApprovalListLegacy;

    // Validate the approval list structure
    if (!approvalList.cumulativeApprovedLabels || !Array.isArray(approvalList.cumulativeApprovedLabels)) {
      throw new Error("Invalid approval list format: missing cumulativeApprovedLabels array");
    }

    return approvalList.cumulativeApprovedLabels;
  } catch (error) {
    console.error("Failed to fetch approved labels from IPFS:", error);
    throw new Error("Failed to fetch approved labels from IPFS");
  }
}

/**
 * Orchestrates fetching ASP root from indexer and approval list from IPFS
 * Fetches approved labels directly from IPFS for most up-to-date data
 */
export async function fetchASPData() {
  try {
    // Step 1: Get latest ASP root and IPFS CID from indexer
    const { root, ipfsCID, timestamp } = await fetchLatestASPRoot();

    // Step 2: Fetch approval list directly from IPFS using the CID
    const approvalList = await fetchApprovedLabelsFromIPFS(ipfsCID);

    return {
      aspRoot: root,
      ipfsCID,
      timestamp,
      approvalList,
    };
  } catch (error) {
    console.error("Failed ASP data orchestration:", error);
    throw new Error("Failed to orchestrate ASP data from multiple sources");
  }
}

// ============ POOL QUERIES ============

/**
 * Fetch pool statistics (total deposits, withdrawals, member count)
 * Uses the Shinobi Indexer SDK consistently
 */
export async function fetchPoolStats(poolAddress?: string): Promise<{
  totalDeposits: string;
  totalWithdrawals: string;
  memberCount: number;
  createdAt: string;
} | null> {
  try {
    const poolId = (poolAddress || CONTRACTS.ETH_PRIVACY_POOL).toLowerCase();

    const result = await indexerClient.getPoolStats(poolId);
    return result;
  } catch (error) {
    console.error("Failed to fetch pool stats:", error);
    throw error; // Throw error instead of returning null
  }
}

/**
 * Get pool configuration and stats
 * Uses the Shinobi Indexer SDK consistently
 */
export async function fetchPoolConfig(poolId: string) {
  try {
    const result = await indexerClient.getPoolConfig(poolId);
    return result;
  } catch (error) {
    console.error("Failed to fetch pool config:", error);
    return null;
  }
}

// ============ HEALTH CHECK QUERIES ============

/**
 * Simple health check using SDK
 * Uses SDK client for consistency
 */
export async function checkIndexerHealth(): Promise<boolean> {
  try {
    const health = await indexerClient.healthCheck();
    return health.status === "ok" || health.status === "healthy";
  } catch (error) {
    return false;
  }
}

/**
 * Get latest indexed block from Ponder meta status
 * Returns actual block data for transaction tracking
 */
export async function fetchLatestIndexedBlock(): Promise<{
  blockNumber: string;
  timestamp: string;
} | null> {
  try {
    const latestBlock = await indexerClient.getLatestIndexedBlock();
    return latestBlock;
  } catch (error) {
    console.error("Failed to fetch latest indexed block:", error);
    return null;
  }
}

/**
 * Check if indexer is responsive for transaction tracking
 * Simple check that returns true if indexer responds, false otherwise
 */
export async function checkIndexerResponsive(): Promise<boolean> {
  return checkIndexerHealth();
}
