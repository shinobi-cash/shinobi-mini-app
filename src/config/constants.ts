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
  MIN_RELAY_FEE_BPS: BigInt(100),      // 1% minimum fee
  MAX_RELAY_FEE_BPS: BigInt(2000),     // 20% maximum fee
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
export const ZK_CONSTANTS = {
  MAX_TREE_DEPTH: 32,
  SNARK_SCALAR_FIELD: "21888242871839275222246405745257275088548364400416034343698204186575808495617",
  CIRCUIT_PATHS: {
    WASM_PATH: '/circuits/build/withdraw/withdraw.wasm',
    ZKEY_PATH: '/circuits/keys/withdraw.zkey',
    VKEY_PATH: '/circuits/keys/withdraw.vkey',
  },
  PUBLIC_SIGNALS_COUNT: 8,
} as const;

// ============ INDEXER CONSTANTS ============

/**
 * GraphQL and indexer configuration
 */
export const INDEXER_CONSTANTS = {
  FETCH_POLICY: 'network-only' as const,
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 1000,
  CACHE_TTL: 300, // 5 minutes in seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

/**
 * IPFS configuration
 */
export const IPFS_CONFIG = {
  GATEWAY_URL: 'https://gateway.pinata.cloud/ipfs/',
  TIMEOUT: 10000, // 10 seconds
  MAX_FILE_SIZE: 1024 * 1024, // 1MB
} as const;

// ============ UI CONSTANTS ============

/**
 * User interface configuration
 */
export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 300, // milliseconds
  TOAST_DURATION: 5000, // milliseconds
  LOADING_TIMEOUT: 30000, // 30 seconds
  FORM_VALIDATION_DELAY: 500, // milliseconds
} as const;


/**
 * Note discovery and caching
 */
export const NOTE_CONSTANTS = {
  MAX_DISCOVERY_ATTEMPTS: 5,
  DISCOVERY_BATCH_SIZE: 10,
  CACHE_VERSION: 1,
  MAX_CACHED_NOTES: 100,
} as const;

// ============ VALIDATION CONSTANTS ============

/**
 * Input validation rules
 */
export const VALIDATION_RULES = {
  ADDRESS_REGEX: /^0x[a-fA-F0-9]{40}$/,
  AMOUNT_REGEX: /^\d*\.?\d*$/,
  MAX_DECIMAL_PLACES: 18,
} as const;

// ============ ERROR CONSTANTS ============

/**
 * Error messages and codes
 */
export const ERROR_MESSAGES = {
  INVALID_AMOUNT: 'Invalid withdrawal amount',
  INVALID_ADDRESS: 'Invalid Ethereum address',
  INSUFFICIENT_BALANCE: 'Insufficient note balance',
  NETWORK_ERROR: 'Network connection error',
  PROOF_GENERATION_FAILED: 'ZK proof generation failed',
  TRANSACTION_FAILED: 'Transaction execution failed',
  INDEXER_UNAVAILABLE: 'Indexer service unavailable',
  CIRCUIT_FILES_MISSING: 'Circuit files not found',
  NO_ACCOUNT_KEY: 'No account key available',
  NOTE_NOT_FOUND: 'Note not found',
  NULLIFIER_ALREADY_SPENT: 'Note already spent',
} as const;

/**
 * HTTP status codes for error handling
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============ DEVELOPMENT CONSTANTS ============

/**
 * Development and testing configuration
 */
export const DEV_CONFIG = {
  ENABLE_DEBUG_LOGS: process.env.NODE_ENV === 'development',
  ENABLE_MOCK_DATA: false,
  ENABLE_TEST_ACCOUNTS: process.env.NODE_ENV !== 'production',
  CIRCUIT_VERIFICATION: true,
} as const;

// ============ FEATURE FLAGS ============

/**
 * Feature toggles for experimental features
 */
export const FEATURE_FLAGS = {
  ENABLE_BATCH_WITHDRAWALS: false,
  ENABLE_ADVANCED_PRIVACY: false,
  ENABLE_CROSS_CHAIN: false,
  ENABLE_RAGEQUIT: false,
  ENABLE_CACHED_PAYMASTER: true,
} as const;

// ============ UTILITY TYPES ============

/**
 * Type exports for constants usage
 */
export type WithdrawalFees = typeof WITHDRAWAL_FEES;
export type GasLimits = typeof GAS_LIMITS;
export type ZKConstants = typeof ZK_CONSTANTS;
export type IndexerConstants = typeof INDEXER_CONSTANTS;
export type ValidationRules = typeof VALIDATION_RULES;
export type ErrorMessages = typeof ERROR_MESSAGES;