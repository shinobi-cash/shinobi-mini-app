/**
 * Storage Library - Main Export
 *
 * Provides secure encrypted storage with improved organization and maintainability
 */

// Main storage manager and backward compatibility alias
export { storageManager, storageManager as noteCache } from "./StorageManager";

// Export data types for external usage
export type {
  Note,
  NoteChain,
  CachedNoteData,
  CachedAccountData,
  NamedPasskeyData,
  DiscoveryResult,
  SessionInfo,
} from "./interfaces/IDataTypes";

// Key derivation service for external usage
export { KDF } from "./services/KeyDerivationService";

/**
 * USAGE EXAMPLE:
 *
 * import { storageManager } from "@/lib/storage";
 * await storageManager.initializeAccountSession(accountName, symmetricKey);
 *
 * // Legacy compatibility:
 * import { noteCache } from "@/lib/storage";
 * await noteCache.initializeAccountSession(accountName, symmetricKey);
 */
