/**
 * GraphQL Queries
 */

import { gql } from '@apollo/client';

// ============ STATE TREE QUERIES ============

/**
 * Get state tree commitments ordered by leafIndex with pagination
 */
export const GET_STATE_TREE_COMMITMENTS = gql`
  query GetStateTreeCommitments($poolId: String!, $limit: Int = 1000, $after: String) {
    merkleTreeLeafs(
      where: { poolId: $poolId }
      limit: $limit
      after: $after
      orderBy: "leafIndex"
      orderDirection: "asc"
    ) {
      items {
        leafIndex
        leafValue
        treeRoot
        treeSize
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

// ============ ASP (APPROVED SET OF PARTICIPANTS) QUERIES ============

/**
 * Get latest ASP root and IPFS CID
 */
export const GET_LATEST_ASP_ROOT = gql`
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
`;

/**
 * Get approved labels from activity (alternative to IPFS)
 */
export const GET_APPROVED_LABELS = gql`
  query GetApprovedLabels {
    activitys(
      where: { type: "DEPOSIT", aspStatus: "approved" }
      orderBy: "timestamp"
      orderDirection: "asc"
    ) {
      items {
        label
        commitment
        timestamp
      }
    }
  }
`;

// ============ DEPOSIT AND ACTIVITY QUERIES ============

/**
 * Get all activities with pagination support
 */
export const GET_ACTIVITIES = gql`
  query GetActivities($poolId: String!, $limit: Int = 10, $after: String, $orderDirection: String = "desc") {
    activitys(
      where: { poolId: $poolId }
      limit: $limit
      after: $after
      orderBy: "timestamp"
      orderDirection: $orderDirection
    ) {
      items {
        id
        type
        aspStatus
        poolId
        user
        recipient
        amount
        originalAmount
        vettingFeeAmount
        commitment
        label
        precommitmentHash
        spentNullifier
        newCommitment
        feeAmount
        feeRefund
        relayer
        isSponsored
        blockNumber
        timestamp
        transactionHash
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

// ============ POOL INFORMATION QUERIES ============

/**
 * Get pool configuration and stats
 */
export const GET_POOL_CONFIG = gql`
  query GetPoolConfig($poolId: String!) {
    pool(id: $poolId) {
      scope
      asset
      totalDeposits
      memberCount
    }
  }
`;

/**
 * Get pool statistics
 */
export const GET_POOL_STATS = gql`
  query GetPoolStats($poolId: String!) {
    pool(id: $poolId) {
      id
      totalDeposits
      totalWithdrawals
      memberCount
      createdAt
    }
  }
`;

// ============ HEALTH AND META QUERIES ============

/**
 * Check indexer health and latest block
 */
export const HEALTH_CHECK = gql`
  query HealthCheck {
    _meta {
      status
    }
  }
`;
