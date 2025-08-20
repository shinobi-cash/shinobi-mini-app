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
export const WITHDRAWAL_ACCOUNT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;

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
export const SNARK_SCALAR_FIELD= "21888242871839275222246405745257275088548364400416034343698204186575808495617";

// ============ INDEXER CONSTANTS ============

/**
 * GraphQL and indexer configuration
 */
export const INDEXER_FETCH_POLICY= 'network-only'

/**
 * IPFS configuration
 */
export const IPFS_GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs/';

// Deployed contract addresses on Base Sepolia (updated to match indexer)
export const CONTRACTS = {
  // SimplePrivacyPoolPaymaster (updated from indexer)
  PAYMASTER: "0xbF03af7e4870c5Cc4e3C4F9914239F5E093F959a",
  
  // Expected smart account for deterministic pattern
  EXPECTED_SMART_ACCOUNT: "0xa3aBDC7f6334CD3EE466A115f30522377787c024",
  
  // Privacy Pool contracts (updated from indexer)
  PRIVACY_POOL_ENTRYPOINT: "0xfBa5eDD64d4611ca50DD8dF9C4F94b895C66219b",
  ETH_PRIVACY_POOL: "0xB68E4f712bd0783fbc6b369409885c2319Db114a",
  
  // ERC-4337 EntryPoint (standard across networks)
  ERC4337_ENTRYPOINT: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
} as const

export const NETWORK = {
  CHAIN_ID: 84532, // Base Sepolia
  NAME: "Base Sepolia",
  RPC_URL: "https://sepolia.base.org",
  EXPLORER_URL: "https://sepolia.basescan.org",
} as const

export const BUNDLER_URL = `https://api.pimlico.io/v2/84532/rpc?apikey=${import.meta.env.VITE_PIMLICO_API_KEY}`
