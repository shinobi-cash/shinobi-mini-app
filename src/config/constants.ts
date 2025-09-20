/**
 * Application Constants
 *
 * Centralized configuration values, limits, and constants used throughout the application.
 * Organized by category for easy maintenance.
 */

// ============ WITHDRAWAL CONSTANTS ============

/**
 * Default withdrawal account private key (deterministic for testing)
 * This should be moved to environment variables in production
 */
export const WITHDRAWAL_ACCOUNT_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;

/**
 * Default withdrawal fee rates
 */
export const WITHDRAWAL_FEES = {
  DEFAULT_RELAY_FEE_BPS: BigInt(1000), // 10% fee in basis points
} as const;

/**
 * Gas limits for Account Abstraction operations
 */
export const GAS_LIMITS = {
  PAYMASTER_POST_OP_GAS_LIMIT: 35000n, // Above the 32,000 minimum
} as const;

// ============ ZK CIRCUIT CONSTANTS ============

/**
 * Zero-knowledge proof and circuit parameters
 */
export const SNARK_SCALAR_FIELD = "21888242871839275222246405745257275088548364400416034343698204186575808495617";

// ============ INDEXER CONSTANTS ============

/**
 * GraphQL and indexer configuration
 */
export const INDEXER_FETCH_POLICY = "network-only";

/**
 * Indexer endpoint configuration based on environment
 */
export const INDEXER_CONFIG = {
  ENDPOINT:
    import.meta.env.MODE === "development"
      ? import.meta.env.VITE_INDEXER_URL_DEV || "http://localhost:42069/proxy/graphql"
      : import.meta.env.VITE_INDEXER_URL_PROD ||
        "https://api.thegraph.com/subgraphs/name/shinobi-cash/privacy-pools-v1",
  TOKEN:
    import.meta.env.MODE === "development"
      ? import.meta.env.VITE_INDEXER_TOKEN_DEV
      : import.meta.env.VITE_INDEXER_TOKEN_PROD,
} as const;

/**
 * IPFS configuration
 */
export const IPFS_GATEWAY_URL = "https://gateway.pinata.cloud/ipfs/";

// Deployed contract addresses on Base Sepolia (updated to match indexer)
export const CONTRACTS = {
  // SimpleShinobiCashPoolPaymaster
  PAYMASTER: "0x207b90941d9cff79A750C1E5c05dDaA17eA01B9F",

  // Expected smart account for deterministic pattern
  EXPECTED_SMART_ACCOUNT: "0xa3aBDC7f6334CD3EE466A115f30522377787c024",

  // ShinobiCash Pool contracts 
  PRIVACY_POOL_ENTRYPOINT: "0xB993eA4F6Bcb16784e9d59688040571490172498",
  ETH_PRIVACY_POOL: "0xB648107Af0009A3447Fce0Ec1542b6A01bDB1E37",

  // ERC-4337 EntryPoint (standard across networks)
  ERC4337_ENTRYPOINT: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
} as const;

export const NETWORK = {
  CHAIN_ID: 421614, // Arbitrum Sepolia
  NAME: "Arbitrum Sepolia",
  RPC_URL: `https://arb-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
  EXPLORER_URL: "https://sepolia.arbiscan.io",
} as const;

export const BUNDLER_URL = `https://api.pimlico.io/v2/421614/rpc?apikey=${import.meta.env.VITE_PIMLICO_API_KEY}`;
