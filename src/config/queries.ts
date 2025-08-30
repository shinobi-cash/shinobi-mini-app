/**
 * GraphQL Queries
 * 
 * Centralized GraphQL queries for The Graph indexer interactions.
 * All queries used for privacy pool data fetching.
 */

import { gql } from '@apollo/client';

// ============ STATE TREE QUERIES ============

/**
 * Get state tree commitments ordered by leafIndex
 */
export const GET_STATE_TREE_COMMITMENTS = gql`
  query GetStateTreeCommitments($poolId: String!) {
    merkleTreeLeafs(
      where: { poolId: $poolId }
      limit: 1000
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


/**
 * Check if nullifier is spent (withdrawal exists)
 */
export const CHECK_NULLIFIER_SPENT = gql`
  query CheckNullifierSpent($spentNullifier: BigInt!) {
    activitys(
      where: { 
        spentNullifier: $spentNullifier 
      }
      limit: 1
    ) {
      items {
        id
        type
        spentNullifier
        blockNumber
        timestamp
        transactionHash
      }
    }
  }
`;

/**
 * Get all deposits for a specific pool
 */
export const GET_POOL_DEPOSITS = gql`
  query GetPoolDeposits($poolId: String!) {
    activitys(
      where: { 
        type: "DEPOSIT"
        poolId: $poolId
      }
      orderBy: "timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        commitment
        label
        amount
        timestamp
        transactionHash
        blockNumber
        type
        aspStatus
        precommitmentHash
      }
    }
  }
`;

/**
 * Get all withdrawals for a specific pool
 */
export const GET_POOL_WITHDRAWALS = gql`
  query GetPoolWithdrawals($poolId: String!) {
    activitys(
      where: { 
        type: "WITHDRAWAL"
        poolId: $poolId
      }
      orderBy: "timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        nullifierHash
        amount
        timestamp
        transactionHash
        blockNumber
        type
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

/**
 * Get subgraph meta information
 */
export const GET_SUBGRAPH_META = gql`
  query GetSubgraphMeta {
    _meta {
      block {
        number
        timestamp
        hash
      }
      deployment
      hasIndexingErrors
    }
  }
`;

// ============ SEARCH AND FILTER QUERIES ============

/**
 * Search activities by transaction hash
 */
export const GET_ACTIVITY_BY_TX_HASH = gql`
  query GetActivityByTxHash($transactionHash: String!) {
    activitys(
      where: { transactionHash: $transactionHash }
    ) {
      items {
        id
        type
        commitment
        nullifierHash
        label
        amount
        timestamp
        transactionHash
        blockNumber
        aspStatus
      }
    }
  }
`;



/**
 * Get activities within a date range
 */
export const GET_ACTIVITIES_BY_DATE_RANGE = gql`
  query GetActivitiesByDateRange(
    $poolId: String!
    $startTimestamp: String!
    $endTimestamp: String!
  ) {
    activitys(
      where: { 
        poolId: $poolId
        timestamp_gte: $startTimestamp
        timestamp_lte: $endTimestamp
      }
      orderBy: "timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        type
        commitment
        nullifierHash
        label
        amount
        timestamp
        transactionHash
        blockNumber
        aspStatus
      }
    }
  }
`;