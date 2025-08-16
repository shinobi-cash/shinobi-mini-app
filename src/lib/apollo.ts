import { ApolloClient, InMemoryCache, gql } from '@apollo/client'

// Shinobi.cash indexer GraphQL endpoint
const INDEXER_URL = 'http://18.223.158.172:42069/graphql'

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
        poolId
        user
        recipient
        amount
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

export const GET_POOLS = gql`
  query GetPools {
    pools {
      items {
        id
        timestamp
      }
    }
  }
`