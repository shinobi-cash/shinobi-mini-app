/**
 * Shinobi Indexer SDK Client
 *
 * Main client for interacting with the Shinobi privacy pool indexer GraphQL API
 */

import {
  ApolloClient,
  type ApolloQueryResult,
  InMemoryCache,
  type NormalizedCacheObject,
  createHttpLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import {
  GET_ACTIVITIES,
  GET_LATEST_ASP_ROOT,
  GET_LATEST_INDEXED_BLOCK,
  GET_POOL_CONFIG,
  GET_POOL_STATS,
  GET_STATE_TREE_COMMITMENTS,
  HEALTH_CHECK,
} from "./queries";
import type {
  ASPApprovalList,
  ActivitiesQueryOptions,
  Activity,
  HealthStatus,
  IndexerError,
  LatestIndexedBlock,
  PaginatedResponse,
  ShinobiIndexerConfig,
  StateTreeLeaf,
} from "./types";

/**
 * Main Shinobi Indexer SDK Client
 */
export class ShinobiIndexerClient {
  private apolloClient: ApolloClient<NormalizedCacheObject>;
  private config: ShinobiIndexerConfig;

  constructor(config: ShinobiIndexerConfig) {
    this.config = config;
    this.apolloClient = this.createApolloClient(this.config);
  }

  /**
   * Create Apollo Client instance
   */
  private createApolloClient(config: ShinobiIndexerConfig): ApolloClient<NormalizedCacheObject> {
    const httpLink = createHttpLink({
      uri: config.endpoint,
    });

    const authLink = setContext((_, { headers }) => {
      return {
        headers: {
          ...headers,
          ...config.headers,
        },
      };
    });

    return new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: {
          errorPolicy: "all",
        },
        query: {
          errorPolicy: "all",
        },
      },
    });
  }

  /**
   * Execute a GraphQL query with error handling
   */
  private async executeQuery<T>(queryFn: () => Promise<ApolloQueryResult<T>>): Promise<T> {
    try {
      const result = await queryFn();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`);
      }

      return result.data;
    } catch (error: unknown) {
      const indexerError: IndexerError = {
        message: (error as Error)?.message || "Unknown error occurred",
        details: error,
      };
      throw indexerError;
    }
  }

  // ============ ACTIVITY METHODS ============

  /**
   * Get activities with pagination
   */
  async getActivities(options: ActivitiesQueryOptions): Promise<PaginatedResponse<Activity>> {
    const data = await this.executeQuery(() =>
      this.apolloClient.query({
        query: GET_ACTIVITIES,
        variables: {
          poolId: options.poolId,
          limit: options.limit || 10,
          after: options.after,
          orderDirection: options.orderDirection || "desc",
        },
        fetchPolicy: "network-only", // Force network request, bypass cache
      }),
    );

    return data.activitys;
  }

  // ============ STATE TREE METHODS ============

  /**
   * Get state tree commitments with pagination
   */
  async getStateTreeCommitments(
    poolId: string,
    limit = 1000,
    after?: string,
  ): Promise<PaginatedResponse<StateTreeLeaf>> {
    const data = await this.executeQuery(() =>
      this.apolloClient.query({
        query: GET_STATE_TREE_COMMITMENTS,
        variables: {
          poolId,
          limit,
          after,
        },
      }),
    );

    return data.merkleTreeLeafs;
  }

  /**
   * Get all state tree leaves for a pool (handles pagination automatically)
   */
  async getAllStateTreeLeaves(poolId: string): Promise<StateTreeLeaf[]> {
    const allLeaves: StateTreeLeaf[] = [];
    let hasNextPage = true;
    let after: string | undefined;

    while (hasNextPage) {
      const result = await this.getStateTreeCommitments(poolId, 1000, after);

      allLeaves.push(...result.items);
      hasNextPage = result.pageInfo.hasNextPage;
      after = result.pageInfo.endCursor;
    }

    return allLeaves;
  }

  // ============ ASP (APPROVED SET OF PARTICIPANTS) METHODS ============

  /**
   * Get latest ASP root and IPFS CID
   */
  async getLatestASPRoot(): Promise<ASPApprovalList | null> {
    const data = await this.executeQuery(() =>
      this.apolloClient.query({
        query: GET_LATEST_ASP_ROOT,
      }),
    );

    const items = data.associationSetUpdates?.items;
    return items && items.length > 0 ? items[0] : null;
  }

  // ============ POOL METHODS ============

  /**
   * Get pool statistics (total deposits, withdrawals, member count)
   */
  async getPoolStats(poolId: string): Promise<{
    totalDeposits: string;
    totalWithdrawals: string;
    memberCount: number;
    createdAt: string;
  } | null> {
    const data = await this.executeQuery(() =>
      this.apolloClient.query({
        query: GET_POOL_STATS,
        variables: { poolId },
        fetchPolicy: "network-only",
      }),
    );

    return data.pool;
  }

  /**
   * Get pool configuration and details
   */
  async getPoolConfig(poolId: string): Promise<{
    id: string;
    totalDeposits: string;
    totalWithdrawals: string;
    memberCount: number;
    createdAt: string;
  } | null> {
    const data = await this.executeQuery(() =>
      this.apolloClient.query({
        query: GET_POOL_CONFIG,
        variables: { poolId },
        fetchPolicy: "network-only",
      }),
    );

    return data.pool;
  }

  // ============ HEALTH METHODS ============

  /**
   * Check indexer health
   */
  async healthCheck(): Promise<HealthStatus> {
    const data = await this.executeQuery(() =>
      this.apolloClient.query({
        query: HEALTH_CHECK,
      }),
    );

    return data._meta;
  }

  /**
   * Get latest indexed block information
   */
  async getLatestIndexedBlock(): Promise<LatestIndexedBlock | null> {
    const data = await this.executeQuery(() =>
      this.apolloClient.query({
        query: GET_LATEST_INDEXED_BLOCK,
        fetchPolicy: "network-only",
      }),
    );

    const status = data._meta?.status;
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
  }
}

/**
 * Create a new Shinobi Indexer client instance
 */
export function createShinobiClient(config: ShinobiIndexerConfig): ShinobiIndexerClient {
  return new ShinobiIndexerClient(config);
}

// ============ GLOBAL CLIENT MANAGEMENT ============

let globalClient: ShinobiIndexerClient | null = null;

/**
 * Set the global client instance
 */
export function setShinobiClient(client: ShinobiIndexerClient): void {
  globalClient = client;
}

/**
 * Get the global client instance
 */
export function getShinobiClient(): ShinobiIndexerClient {
  if (!globalClient) {
    throw new Error("ShinobiIndexerClient not initialized. Call setShinobiClient() first.");
  }
  return globalClient;
}
