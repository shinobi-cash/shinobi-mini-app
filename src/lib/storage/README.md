# Refactored Storage Architecture

This directory contains a refactored version of the storage layer that maintains **100% data compatibility** with the current implementation while improving code organization and maintainability.

## **Architecture Overview**

### **Current Implementation Issues**
- `noteCache.ts` (700+ lines) handles 4 different concerns in one class
- Direct storage access scattered across 15+ files
- Mixed encryption, storage, and business logic responsibilities
- No clear abstraction between storage types

### **Refactored Structure**
```
src/lib/storage-refactored/
├── interfaces/           # Storage contracts
│   ├── IStorageAdapter.ts     # Base storage interfaces
│   └── IDataTypes.ts          # Data type definitions (exact matches)
├── adapters/             # Storage implementations
│   ├── BrowserStorageAdapter.ts   # localStorage/sessionStorage
│   └── IndexedDBAdapter.ts        # IndexedDB with encryption
├── services/            # Pure services
│   └── EncryptionService.ts       # Crypto operations only
├── repositories/        # Domain-specific data access
│   ├── NotesRepository.ts         # Note chain operations
│   ├── AccountRepository.ts       # Account management
│   ├── PasskeyRepository.ts       # Passkey storage
│   └── SessionRepository.ts       # Session & browser storage
├── StorageManager.ts     # Main coordinator (noteCache replacement)
└── index.ts             # Public API exports
```

## **Key Design Principles**

### **1. Data Compatibility**
- **Same database structure**: `shinobi.cash` v3 with same stores
- **Same encryption**: AES-GCM with identical key derivation
- **Same data formats**: All interfaces match current types exactly
- **Same storage keys**: localStorage/sessionStorage keys unchanged

### **2. Separation of Concerns**
- **EncryptionService**: Pure crypto operations (no storage)
- **Storage Adapters**: Raw storage operations (no business logic)
- **Repositories**: Domain-specific data access patterns
- **StorageManager**: Coordinates between layers

### **3. Backward Compatibility**
```typescript
// Current usage (still works):
import { noteCache } from "@/lib/storage/noteCache";
await noteCache.initializeAccountSession(accountName, symmetricKey);

// New usage (drop-in replacement):
import { noteCache } from "@/lib/storage-refactored";
await noteCache.initializeAccountSession(accountName, symmetricKey);
```

## **Storage Operations Mapping**

### **Notes Operations** → `NotesRepository`
- `getCachedNotes(publicKey, poolAddress)` → DiscoveryResult | null
- `storeDiscoveredNotes(publicKey, poolAddress, notes, cursor)` → void
- `getNextDepositIndex(publicKey, poolAddress)` → number
- `updateLastUsedDepositIndex(publicKey, poolAddress, depositIndex)` → void

### **Account Operations** → `AccountRepository`
- `storeAccountData(accountData)` → void
- `getAccountData()` → CachedAccountData | null
- `getAccountDataByName(accountName)` → CachedAccountData | null
- `listAccountNames()` → string[]
- `accountExists(accountName)` → boolean

### **Passkey Operations** → `PasskeyRepository`
- `storePasskeyData(passkeyData)` → void
- `getPasskeyData(accountName)` → NamedPasskeyData | null
- `passkeyExists(accountName)` → boolean

### **Session Operations** → `SessionRepository`
- Session info (sessionStorage): storeSessionInfo, getStoredSessionInfo, clearSessionInfo
- User salts (localStorage): getOrCreateUserSalt, storeUserSalt
- Session markers (localStorage): markSessionInitialized, hasEncryptedData
- Theme storage (localStorage): storeTheme, getTheme

## **Benefits of Refactoring**

### **1. Maintainability**
- **Single Responsibility**: Each class has one clear purpose
- **Easier Testing**: Individual layers can be mocked and tested
- **Clearer Dependencies**: Explicit interfaces between layers

### **2. Extensibility** 
- **New Storage Backends**: Can add OPFS, WebSQL, etc. without changing business logic
- **Storage Migration**: Can migrate between storage types transparently
- **Mobile Optimization**: Storage operations can be optimized per implementation

### **3. Security**
- **Clear Boundaries**: Encryption separated from storage operations
- **Key Management**: Centralized encryption key lifecycle
- **Error Isolation**: Storage failures don't affect encryption logic

### **4. Code Organization**
- **Domain Separation**: Notes, accounts, and passkeys in separate repositories
- **Type Safety**: Better separation of encrypted vs plaintext data
- **Consistent APIs**: All storage operations follow same patterns

## **Migration Path**

1. **Phase 1**: Review refactored implementation (current)
2. **Phase 2**: Update imports to use refactored storage (gradual)
3. **Phase 3**: Remove old noteCache.ts after full migration
4. **Phase 4**: Optimize individual storage adapters for mobile performance

## **Implementation Notes**

- **Database Schema**: Unchanged - same stores, indexes, and data structure
- **Encryption Algorithm**: Unchanged - same AES-GCM with Web Crypto API
- **Session Management**: Unchanged - same timeout, environment detection
- **Error Handling**: Improved - better error boundaries and propagation
- **Mobile Focus**: Storage operations optimized for mobile performance patterns