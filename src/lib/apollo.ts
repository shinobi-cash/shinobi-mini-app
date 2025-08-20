import { ApolloClient, InMemoryCache, gql } from '@apollo/client'

// Shinobi.cash indexer GraphQL endpoint
const INDEXER_URL = import.meta.env.VITE_SUBGRAPH_URL || 
  (process.env.NODE_ENV === 'development' 
    ? 'http://localhost:42069/graphql'  // Local development
    : import.meta.env.VITE_PRODUCTION_INDEXER_URL)  // Production (must be set)

export const apolloClient = new ApolloClient({
  uri: INDEXER_URL,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
})

// GraphQL queries for the indexer
export const GET_ACTIVITIES = gql`
  query GetActivities($limit: Int = 15, $after: String) {
    activitys(limit: $limit, after: $after, orderBy: "timestamp", orderDirection: "desc") {
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
`




// Get deposit by precommitment hash
const buildDepositByPrecommitmentQuery = (precommitmentHash: string) => gql`
  query GetDepositByPrecommitment {
    activitys(where: { precommitmentHash: "${precommitmentHash}" }, limit: 1) {
      items {
        id
        type
        aspStatus
        poolId
        user
        amount
        originalAmount
        vettingFeeAmount
        commitment
        label
        precommitmentHash
        spentNullifier
        newCommitment
        feeAmount
        relayer
        isSponsored
        blockNumber
        timestamp
        transactionHash
      }
    }
  }
`

// Check if nullifier has been spent in withdrawal
const buildWithdrawalByNullifierQuery = (nullifier: string) => gql`
  query CheckWithdrawalByNullifier {
    activitys(where: { spentNullifier: "${nullifier}" }, limit: 1) {
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
`



/**
 * Fetch deposit by precommitment hash for specific note data
 */
export async function fetchDepositByPrecommitment(precommitmentHash: string) {
  try {
    const query = buildDepositByPrecommitmentQuery(precommitmentHash);
    const result = await apolloClient.query({
      query,
      fetchPolicy: 'network-only',
    });
    
    return result.data?.activitys?.items?.[0] || null;
  } catch (error) {
    console.error('Failed to fetch deposit by precommitment:', error);
    return null;
  }
}

/**
 * Check if nullifier has been spent in a withdrawal
 * Returns true if the nullifier has been used in a withdrawal activity
 */
export async function isNullifierSpent(nullifier: string): Promise<boolean> {
  try {
    const query = buildWithdrawalByNullifierQuery(nullifier);
    const result = await apolloClient.query({
      query,
      fetchPolicy: 'network-only',
    });
    
    return result.data?.activitys?.items?.length > 0;
  } catch (error) {
    console.error('Failed to check withdrawal by nullifier:', error);
    // On error, assume not spent to avoid marking valid deposits as spent
    return false;
  }
}