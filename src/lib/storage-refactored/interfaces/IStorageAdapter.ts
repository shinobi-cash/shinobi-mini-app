/**
 * Base Storage Interface
 * Defines common operations for all storage adapters
 */
export interface IStorageAdapter<T = any> {
  get(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
}

/**
 * Key-Value Storage Interface
 * For storage that supports key-value operations (localStorage, sessionStorage)
 */
export interface IKeyValueStorageAdapter<T = any> extends IStorageAdapter<T> {
  set(key: string, value: T): Promise<void>;
}

/**
 * Document Storage Interface  
 * For storage that uses object properties as keys (IndexedDB)
 */
export interface IDocumentStorageAdapter<T = any> extends IStorageAdapter<T> {
  set(value: T): Promise<void>;
}

/**
 * Encrypted Storage Interface
 * For storage that requires encryption/decryption
 */
export interface IEncryptedStorageAdapter<T = any> extends IDocumentStorageAdapter<T> {
  initializeSession(encryptionKey: CryptoKey): Promise<void>;
  clearSession(): void;
  isSessionActive(): boolean;
}

/**
 * Browser Storage Interface
 * For localStorage/sessionStorage wrappers
 */
export interface IBrowserStorageAdapter<T = any> extends IKeyValueStorageAdapter<T> {
  getAllKeys(): string[];
  removeByPrefix(prefix: string): void;
}