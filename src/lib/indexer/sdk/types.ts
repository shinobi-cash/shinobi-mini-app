/**
 * Core types for Shinobi privacy pool indexer data
 */

// ============ ACTIVITY TYPES ============

/**
 * Core activity data structure returned by the indexer
 */
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
  commitment: string;
  label?: string;
  precommitmentHash?: string;
  spentNullifier?: string;
  newCommitment?: string;
  feeAmount?: string;
  feeRefund?: string;
  relayer?: string;
  isSponsored?: boolean;
  blockNumber: string;
  timestamp: string;
  transactionHash: string;
}

// ============ PAGINATION TYPES ============

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: PageInfo;
}

// ============ STATE TREE TYPES ============

export interface StateTreeLeaf {
  leafIndex: string;
  leafValue: string;
  treeRoot: string;
  treeSize: string;
}

// ============ ASP (APPROVED SET OF PARTICIPANTS) TYPES ============

export interface ASPApprovalList {
  root: string;
  ipfsCID: string;
  timestamp: string;
}

export interface ASPData {
  root: string;
  ipfsCID: string;
  timestamp: string;
  approvalList: string[]; // List of approved labels/commitments
}

// ============ QUERY OPTIONS ============

export interface ActivitiesQueryOptions {
  poolId: string;
  limit?: number;
  after?: string;
  orderDirection?: "asc" | "desc";
}

// ============ HEALTH CHECK TYPES ============

export interface HealthStatus {
  status: string;
}

export interface LatestIndexedBlock {
  blockNumber: string;
  timestamp: string;
}

// ============ ERROR TYPES ============

export interface IndexerError {
  message: string;
  code?: string;
  details?: any;
}

// ============ CLIENT CONFIGURATION ============

export interface ShinobiIndexerConfig {
  endpoint: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}
