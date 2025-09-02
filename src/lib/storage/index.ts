/**
 * Refactored Storage Library - Main Export
 * 
 * Provides exact same API as current noteCache for seamless replacement
 * while improving internal organization and maintainability
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
export { KDF_Refactored } from "./services/KeyDerivationService";

/**
 * USAGE EXAMPLE - Drop-in replacement:
 * 
 * // OLD:
 * import { noteCache } from "@/lib/storage/noteCache";
 * await noteCache.initializeAccountSession(accountName, symmetricKey);
 * 
 * // NEW (exact same API):
 * import { noteCache } from "@/lib/storage";
 * await noteCache.initializeAccountSession(accountName, symmetricKey);
 * 
 * OR use the new name:
 * import { storageManager } from "@/lib/storage";
 * await storageManager.initializeAccountSession(accountName, symmetricKey);
 */