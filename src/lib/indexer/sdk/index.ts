/**
 * Shinobi Indexer SDK
 * 
 * A TypeScript SDK for interacting with the Shinobi privacy pool indexer GraphQL API
 */

// ============ MAIN CLIENT ============
export { ShinobiIndexerClient, createShinobiClient, setShinobiClient, getShinobiClient } from "./client";

// ============ TYPES ============
export type {
  // Core types
  Activity,
  
  // State tree types
  StateTreeLeaf,
  
  // ASP types
  ASPApprovalList,
  ASPData,
  
  // Health types
  LatestIndexedBlock,
  
  // Configuration types
  ShinobiIndexerConfig,
} from "./types";

// ============ VERSION ============
export const SDK_VERSION = "1.0.0";
