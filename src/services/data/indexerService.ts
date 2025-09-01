/**
 * Indexer Service
 */

import { indexerClient } from "@/lib/indexer/client";
import { CONTRACTS, IPFS_GATEWAY_URL } from "@/config/constants";

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
  limit: number = 100,
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
export async function fetchStateTreeLeaves(poolId: string): Promise<any[]> {
  try {
    console.log("📊 Fetching state tree commitments...");

    // Use SDK's built-in method that handles pagination automatically
    const allLeaves = await indexerClient.getAllStateTreeLeaves(poolId);

    console.log(`✅ All state tree leaves fetched: ${allLeaves.length} leaves`);

    return allLeaves.map(leaf => ({
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
    console.log("🌳 Fetching latest ASP root...");

    const latestUpdate = await indexerClient.getLatestASPRoot();

    if (!latestUpdate?.root || !latestUpdate?.ipfsCID) {
      throw new Error("No ASP root found or missing IPFS CID");
    }

    console.log(`✅ Latest ASP root found: ${latestUpdate.root}`);
    console.log(`📎 IPFS CID: ${latestUpdate.ipfsCID}`);

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
    console.log("🏷️ Fetching approved labels from IPFS...");
    const ipfsResponse = await fetch(`${IPFS_GATEWAY_URL}${ipfsCID}`);

    if (!ipfsResponse.ok) {
      throw new Error(`IPFS fetch failed: ${ipfsResponse.status} ${ipfsResponse.statusText}`);
    }

    const approvalList = (await ipfsResponse.json()) as ASPApprovalListLegacy;

    // Validate the approval list structure
    if (!approvalList.cumulativeApprovedLabels || !Array.isArray(approvalList.cumulativeApprovedLabels)) {
      throw new Error("Invalid approval list format: missing cumulativeApprovedLabels array");
    }

    const approvedLabels = approvalList.cumulativeApprovedLabels;
    console.log(`✅ Approved labels fetched from IPFS: ${approvedLabels.length} labels`);

    return approvedLabels;
  } catch (error) {
    console.error("Failed to fetch approved labels from IPFS:", error);
    throw new Error("Failed to fetch approved labels from IPFS");
  }
}

/**
 * Orchestrates fetching ASP root from indexer and approval list from IPFS
 * Uses SDK client which handles the orchestration internally
 */
export async function fetchASPData(): Promise<any> {
  try {
    console.log("🔄 Orchestrating ASP data fetch (indexer + IPFS)...");

    // Use SDK's built-in method that combines ASP root and approval list
    const aspData = await indexerClient.getASPData();

    if (!aspData) {
      throw new Error("No ASP data available");
    }

    console.log(`✅ ASP data orchestration complete`);
    console.log(`🌳 ASP Root: ${aspData.root}`);
    console.log(`📦 IPFS CID: ${aspData.ipfsCID}`);
    console.log(`📋 Approval list: ${aspData.approvalList.length} items`);

    return {
      aspRoot: aspData.root,
      ipfsCID: aspData.ipfsCID,
      approvedLabels: aspData.approvalList,
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
