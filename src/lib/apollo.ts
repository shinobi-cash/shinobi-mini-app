import { ApolloClient, InMemoryCache, gql } from '@apollo/client'

// Shinobi.cash indexer GraphQL endpoint
const INDEXER_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:42069/graphql'  // Local development
  : 'http://18.223.158.172:42069/graphql'  // Production

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


// Check if a cash note precommitment already exists on-chain
const buildPrecommitmentExistsQuery = (precommitmentHash: string) => gql`
  query CheckPrecommitmentExists {
    activitys(where: { precommitmentHash: "${precommitmentHash}" }, limit: 1) {
      items {
        id
        precommitmentHash
        user
        blockNumber
        timestamp
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

/**
 * Check if a cash note precommitment already exists on-chain
 * Returns true if the precommitment is already used
 */
export async function checkNotePrecommitmentExists(precommitment: string): Promise<boolean> {
  try {
    const query = buildPrecommitmentExistsQuery(precommitment);
    const result = await apolloClient.query({
      query,
      fetchPolicy: 'network-only', // Always check latest on-chain state
    });
    
    return result.data?.activitys?.items?.length > 0;
  } catch (error) {
    console.error('Failed to check note precommitment on-chain:', error);
    // On error, assume not used to avoid blocking deposits
    // This allows graceful degradation when indexer is unavailable
    return false;
  }
}


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