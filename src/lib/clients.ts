/**
 * Singleton Client Instances
 * 
 * Centralized configuration and initialization of all singleton client instances
 * used throughout the application. This provides a single source of truth for
 * client configurations and makes it easier to manage dependencies.
 */

import { ApolloClient, InMemoryCache } from '@apollo/client';

// ============ APOLLO GRAPHQL CLIENT ============

// Shinobi.cash indexer GraphQL endpoint configuration
const INDEXER_URL = import.meta.env.VITE_SUBGRAPH_URL || 
  (process.env.NODE_ENV === 'development' 
    ? 'http://localhost:42069/graphql'  // Local development
    : import.meta.env.VITE_PRODUCTION_INDEXER_URL);  // Production (must be set)

/**
 * Apollo GraphQL client instance for interacting with The Graph indexer
 * 
 * Configuration:
 * - Error policy: 'all' - Return both data and errors
 * - Cache: InMemoryCache with default settings
 * - Auto-configured endpoint based on environment
 */
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
});

// ============ FUTURE CLIENT INSTANCES ============

/*
 * Add other singleton client instances here as needed:
 * 
 * export const httpClient = axios.create({ ... });
 * export const ipfsClient = new IpfsClient({ ... });
 * export const walletClient = createWalletClient({ ... });
 * 
 * This keeps all external service connections in one place
 * and makes it easier to mock or replace them for testing.
 */