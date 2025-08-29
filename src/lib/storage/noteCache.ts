/**
 * Encrypted Note Cache Service - Privacy-focused IndexedDB with Web Crypto API
 * Stores all sensitive note data encrypted using user-derived keys
 */

import { restoreFromMnemonic } from '@/utils/crypto';

// Types for discovered notes
export interface Note {
  poolAddress: string;
  depositIndex: number;
  changeIndex: number;
  amount: string;
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
  status: 'unspent' | 'spent';
  label: string;
}

export type NoteChain = Note[];

export interface CachedNoteData {
  poolAddress: string;
  publicKey: string; // Safe public key identifier
  notes: NoteChain[];
  lastUsedDepositIndex: number;
  lastSyncTime: number;
  lastProcessedCursor?: string; // V2 pagination cursor
}

export interface CachedAccountData {
  accountName: string;
  mnemonic: string[];
  createdAt: number;
}

export interface NamedPasskeyData {
  accountName: string; // Primary key - user-provided name
  credentialId: string;
  challenge: string;
  publicKeyHash: string; // Links to account
  created: number;
}

export interface DiscoveryResult {
  notes: NoteChain[];
  lastUsedIndex: number;
  newNotesFound: number;
  lastProcessedCursor?: string; // Pagination cursor for V2 discovery
}

interface EncryptedData {
  iv: Uint8Array;
  data: Uint8Array;
  salt: Uint8Array;
}

interface StoredEncryptedData {
  id: string;
  publicKeyHash: string; // Hashed for indexing, not the actual public key
  poolAddressHash: string; // Hashed for indexing
  encryptedPayload: {
    iv: string; // base64
    data: string; // base64
    salt: string; // base64
  };
  lastSyncTime: number;
}

const DB_NAME = 'shinobi.cash';
const DB_VERSION = 3; // Incremented to add passkey store
const STORE_NAME = 'encrypted-notes';
const ACCOUNT_STORE_NAME = 'encrypted-account';
const PASSKEY_STORE_NAME = 'passkey-credentials';
const STORAGE_KEY = 'shinobi.encrypted.session';
const CRYPTO_ALGO = 'AES-GCM';
const HASH_ALGO = 'SHA-256';

class NoteCacheService {
  private db: IDBDatabase | null = null;
  private encryptionKey: CryptoKey | null = null;
  private currentAccountName: string | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        
        // Verify all required stores exist
        if (!this.db.objectStoreNames.contains(STORE_NAME) ||
            !this.db.objectStoreNames.contains(ACCOUNT_STORE_NAME) ||
            !this.db.objectStoreNames.contains(PASSKEY_STORE_NAME)) {
          console.warn('Some object stores are missing. Database may need to be recreated.');
        }
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        console.log(`Upgrading database from version ${oldVersion} to ${DB_VERSION}`);
        
        // Handle migration from version 0 (new installation) or version 1 (upgrade)
        if (oldVersion < 1) {
          // New installation or very old version - create notes store
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            console.log('Creating notes store');
            const notesStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            notesStore.createIndex('publicKeyHash', 'publicKeyHash', { unique: false });
            notesStore.createIndex('poolAddressHash', 'poolAddressHash', { unique: false });
          }
        }
        
        if (oldVersion < 2) {
          // Upgrade to version 2 - add account store
          if (!db.objectStoreNames.contains(ACCOUNT_STORE_NAME)) {
            console.log('Creating account store');
            const accountStore = db.createObjectStore(ACCOUNT_STORE_NAME, { keyPath: 'id' });
            accountStore.createIndex('publicKeyHash', 'publicKeyHash', { unique: false });
          }
        }
        
        if (oldVersion < 3) {
          // Upgrade to version 3 - add passkey store
          if (!db.objectStoreNames.contains(PASSKEY_STORE_NAME)) {
            console.log('Creating passkey store');
            const passkeyStore = db.createObjectStore(PASSKEY_STORE_NAME, { keyPath: 'accountName' });
            passkeyStore.createIndex('publicKeyHash', 'publicKeyHash', { unique: false });
            passkeyStore.createIndex('credentialId', 'credentialId', { unique: false });
          }
        }
        
        console.log('Database upgrade completed');
      };
    });
  }

  /**
   * Reset the database by deleting and recreating it
   */
  async resetDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    return new Promise((resolve, reject) => {
      const deleteReq = indexedDB.deleteDatabase(DB_NAME);
      
      deleteReq.onerror = () => reject(deleteReq.error);
      deleteReq.onsuccess = () => {
        console.log('Database deleted successfully');
        this.init().then(resolve).catch(reject);
      };
      deleteReq.onblocked = () => {
        console.warn('Database deletion blocked. Close other tabs/windows using this app.');
      };
    });
  }

  /**
   * Initialize account-scoped session with derived encryption key
   */
  async initializeAccountSession(accountName: string, symmetricKey: CryptoKey): Promise<void> {
    // Store current account context and derived key
    this.currentAccountName = accountName;
    this.encryptionKey = symmetricKey;
    
    // Mark that encrypted session exists (for hasEncryptedData check)
    try {
      localStorage.setItem(`${STORAGE_KEY}_${accountName}`, 'initialized');
    } catch (error) {
      console.warn('Failed to set session marker:', error);
    }
  }


  /**
   * Clear session data from memory
   */
  clearSession(): void {
    this.encryptionKey = null;
    this.currentAccountName = null;
  }

  /**
   * Get the stored encryption key (already derived)
   */
  private getEncryptionKey(): CryptoKey {
    if (!this.encryptionKey) {
      throw new Error('Session not initialized - call initializeAccountSession() first');
    }
    return this.encryptionKey;
  }

  /**
   * Create privacy-preserving hash for indexing
   */
  async createHash(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input.toLowerCase());
    const hashBuffer = await crypto.subtle.digest(HASH_ALGO, data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Encrypt sensitive data
   */
  private async encrypt(data: CachedNoteData): Promise<EncryptedData> {
    const salt = crypto.getRandomValues(new Uint8Array(32)); // Random salt for this encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = this.getEncryptionKey();
    
    const encoder = new TextEncoder();
    const jsonData = encoder.encode(JSON.stringify(data));
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: CRYPTO_ALGO, iv: iv } as AesGcmParams,
      key,
      jsonData
    );

    return {
      iv,
      data: new Uint8Array(encryptedData),
      salt
    };
  }

  /**
   * Decrypt sensitive data
   */
  private async decrypt(encryptedData: EncryptedData): Promise<CachedNoteData> {
    const key = this.getEncryptionKey();
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: CRYPTO_ALGO, iv: encryptedData.iv } as AesGcmParams,
      key,
      new Uint8Array(encryptedData.data)
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString);
  }

  /**
   * Convert binary data to base64 for storage
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer));
  }

  /**
   * Convert base64 back to binary data
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    return new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
  }

  private async getKey(publicKey: string, poolAddress: string): Promise<string> {
    const publicKeyHash = await this.createHash(publicKey);
    const poolAddressHash = await this.createHash(poolAddress);
    return `${publicKeyHash}_${poolAddressHash}`;
  }

  async getCachedNotes(publicKey: string, poolAddress: string): Promise<DiscoveryResult | null> {
    if (!this.db) await this.init();
    if (!this.encryptionKey) throw new Error('Session not initialized');

    const cached = await this.getCachedData(publicKey, poolAddress);

    if (cached) {
      return {
        notes: cached.notes,
        lastUsedIndex: cached.lastUsedDepositIndex,
        newNotesFound: 0,
        lastProcessedCursor: cached.lastProcessedCursor,
      };
    }

    return null;
  }

  async storeDiscoveredNotes(
    publicKey: string,
    poolAddress: string,
    notes: NoteChain[],
    lastProcessedCursor?: string
  ): Promise<void> {
    if (!this.db) await this.init();
    if (!this.encryptionKey) throw new Error('Session not initialized');

    const lastUsedIndex = notes.length > 0
      ? Math.max(...notes.map(chain => chain[0].depositIndex))
      : -1;

    await this.storeData(publicKey, poolAddress, notes, lastUsedIndex, lastProcessedCursor);
  }

  private async storeData(
    publicKey: string,
    poolAddress: string,
    notes: NoteChain[],
    lastUsedDepositIndex: number,
    lastProcessedCursor?: string
  ): Promise<void> {
    if (!this.db) await this.init();

    const sensitiveData: CachedNoteData = {
      poolAddress,
      publicKey,
      notes,
      lastUsedDepositIndex,
      lastSyncTime: Date.now(),
      lastProcessedCursor,
    };

    const encrypted = await this.encrypt(sensitiveData);
    
    const storageData: StoredEncryptedData = {
      id: await this.getKey(publicKey, poolAddress),
      publicKeyHash: await this.createHash(publicKey),
      poolAddressHash: await this.createHash(poolAddress),
      encryptedPayload: {
        iv: this.arrayBufferToBase64(encrypted.iv),
        data: this.arrayBufferToBase64(encrypted.data),
        salt: this.arrayBufferToBase64(encrypted.salt)
      },
      lastSyncTime: sensitiveData.lastSyncTime
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(storageData);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async getCachedData(publicKey: string, poolAddress: string): Promise<CachedNoteData | null> {
    if (!this.db) await this.init();

    return new Promise(async (resolve, reject) => {
      try {
        const key = await this.getKey(publicKey, poolAddress);
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = async () => {
          const result: StoredEncryptedData = request.result;
          if (result) {
            try {
              const encryptedData: EncryptedData = {
                iv: this.base64ToArrayBuffer(result.encryptedPayload.iv),
                data: this.base64ToArrayBuffer(result.encryptedPayload.data),
                salt: this.base64ToArrayBuffer(result.encryptedPayload.salt)
              };
              
              const decryptedData = await this.decrypt(encryptedData);
              resolve(decryptedData);
            } catch (decryptionError) {
              console.error('Failed to decrypt cached data:', decryptionError);
              resolve(null); // Return null if decryption fails (wrong password)
            }
          } else {
            resolve(null);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async getNextDepositIndex(publicKey: string, poolAddress: string): Promise<number> {
    const cached = await this.getCachedData(publicKey, poolAddress);
    return cached ? cached.lastUsedDepositIndex + 1 : 0;
  }

  async updateLastUsedDepositIndex(
    publicKey: string,
    poolAddress: string,
    depositIndex: number
  ): Promise<void> {
    const cached = await this.getCachedData(publicKey, poolAddress);

    const notes = cached ? cached.notes : [];
    const lastUsedIndex = cached ? Math.max(cached.lastUsedDepositIndex, depositIndex) : depositIndex;
    const lastProcessedCursor = cached ? cached.lastProcessedCursor : undefined;

    await this.storeData(publicKey, poolAddress, notes, lastUsedIndex, lastProcessedCursor);
  }

  /**
   * Clear all cached data (for logout/session end)
   */
  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME, ACCOUNT_STORE_NAME, PASSKEY_STORE_NAME], 'readwrite');
      const notesStore = transaction.objectStore(STORE_NAME);
      const accountStore = transaction.objectStore(ACCOUNT_STORE_NAME);
      const passkeyStore = transaction.objectStore(PASSKEY_STORE_NAME);
      
      let completed = 0;
      const total = 3;
      
      const checkComplete = () => {
        completed++;
        if (completed === total) {
          this.clearSession();
          // Clear all account-specific session markers from localStorage
          try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key?.startsWith(STORAGE_KEY)) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
          } catch (error) {
            console.warn('Failed to clear session markers:', error);
          }
          resolve();
        }
      };

      const notesRequest = notesStore.clear();
      const accountRequest = accountStore.clear();
      const passkeyRequest = passkeyStore.clear();

      notesRequest.onerror = () => reject(notesRequest.error);
      notesRequest.onsuccess = checkComplete;
      
      accountRequest.onerror = () => reject(accountRequest.error);
      accountRequest.onsuccess = checkComplete;
      
      passkeyRequest.onerror = () => reject(passkeyRequest.error);
      passkeyRequest.onsuccess = checkComplete;
    });
  }

  /**
   * Store account keys in encrypted storage
   */
  async storeAccountData(accountData: CachedAccountData): Promise<void> {
    if (!this.db) await this.init();
    if (!this.encryptionKey) throw new Error('Session not initialized');

    // Derive public key from mnemonic for indexing
    const { publicKey } = restoreFromMnemonic(accountData.mnemonic);
    
    const encrypted = await this.encryptAccountData(accountData);
    const publicKeyHash = await this.createHash(publicKey);
    
    const storageData = {
      id: accountData.accountName, // Use account name as primary key
      publicKeyHash,
      encryptedPayload: {
        iv: this.arrayBufferToBase64(encrypted.iv),
        data: this.arrayBufferToBase64(encrypted.data),
        salt: this.arrayBufferToBase64(encrypted.salt)
      },
      createdAt: accountData.createdAt
    };

    return new Promise((resolve, reject) => {
      try {
        // Check if the account store exists
        if (!this.db!.objectStoreNames.contains(ACCOUNT_STORE_NAME)) {
          console.error(`${ACCOUNT_STORE_NAME} object store not found. Available stores:`, Array.from(this.db!.objectStoreNames));
          reject(new Error(`Database corruption: ${ACCOUNT_STORE_NAME} object store missing. Try clearing browser data.`));
          return;
        }

        const transaction = this.db!.transaction([ACCOUNT_STORE_NAME], 'readwrite');
        
        transaction.onerror = () => {
          console.error('Transaction failed:', transaction.error);
          reject(transaction.error);
        };
        
        const store = transaction.objectStore(ACCOUNT_STORE_NAME);
        const request = store.put(storageData);

        request.onerror = () => {
          console.error('Store operation failed:', request.error);
          reject(request.error);
        };
        request.onsuccess = () => resolve();
      } catch (error) {
        console.error('Exception in storeAccountData:', error);
        reject(error);
      }
    });
  }

  /**
   * Retrieve account keys from encrypted storage by account name
   */
  async getAccountDataByName(accountName: string): Promise<CachedAccountData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ACCOUNT_STORE_NAME], 'readonly');
      const store = transaction.objectStore(ACCOUNT_STORE_NAME);
      const request = store.get(accountName);

      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const result = request.result;
        if (result) {
          try {
            // For retrieval, we need to temporarily initialize the session
            // This method is used during authentication setup
            resolve(result); // Return the raw encrypted data for now
          } catch (error) {
            console.error('Failed to retrieve account data:', error);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * Retrieve account keys from encrypted storage (legacy - for current session)
   */
  async getAccountData(): Promise<CachedAccountData | null> {
    if (!this.db) await this.init();
    if (!this.encryptionKey) throw new Error('Session not initialized');
    if (!this.currentAccountName) throw new Error('No current account context');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ACCOUNT_STORE_NAME], 'readonly');
      const store = transaction.objectStore(ACCOUNT_STORE_NAME);
      const request = store.get(this.currentAccountName!);

      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const result = request.result;
        if (result) {
          try {
            const encryptedData = {
              iv: this.base64ToArrayBuffer(result.encryptedPayload.iv),
              data: this.base64ToArrayBuffer(result.encryptedPayload.data),
              salt: this.base64ToArrayBuffer(result.encryptedPayload.salt)
            };
            
            const decryptedData = await this.decryptAccountData(encryptedData);
            resolve(decryptedData);
          } catch (decryptionError) {
            console.error('Failed to decrypt account data:', decryptionError);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * Encrypt account data
   */
  private async encryptAccountData(data: CachedAccountData): Promise<EncryptedData> {
    const salt = crypto.getRandomValues(new Uint8Array(32)); // Random salt for this encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = this.getEncryptionKey();
    
    const encoder = new TextEncoder();
    const jsonData = encoder.encode(JSON.stringify(data));
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: CRYPTO_ALGO, iv: iv } as AesGcmParams,
      key,
      jsonData
    );

    return {
      iv,
      data: new Uint8Array(encryptedData),
      salt
    };
  }

  /**
   * Decrypt account data
   */
  private async decryptAccountData(encryptedData: EncryptedData): Promise<CachedAccountData> {
    const key = this.getEncryptionKey();
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: CRYPTO_ALGO, iv: encryptedData.iv } as AesGcmParams,
      key,
      new Uint8Array(encryptedData.data)
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString);
  }

  /**
   * Store named passkey data
   */
  async storePasskeyData(passkeyData: NamedPasskeyData): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PASSKEY_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(PASSKEY_STORE_NAME);
      const request = store.put(passkeyData);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get passkey data by account name
   */
  async getPasskeyData(accountName: string): Promise<NamedPasskeyData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PASSKEY_STORE_NAME], 'readonly');
      const store = transaction.objectStore(PASSKEY_STORE_NAME);
      const request = store.get(accountName);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  /**
   * List all available account names (for account selection)
   */
  async listAccountNames(): Promise<string[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ACCOUNT_STORE_NAME], 'readonly');
      const store = transaction.objectStore(ACCOUNT_STORE_NAME);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
    });
  }

  /**
   * Check if account name exists
   */
  async accountExists(accountName: string): Promise<boolean> {
    try {
      const accountData = await this.getAccountDataByName(accountName);
      return accountData !== null;
    } catch (error) {
      console.warn('Failed to check account existence:', error);
      // Return false if database is not accessible - assume account doesn't exist
      // This prevents form validation from failing during database initialization
      return false;
    }
  }

  /**
   * Check if passkey exists for account
   */
  async passkeyExists(accountName: string): Promise<boolean> {
    try {
      const passkeyData = await this.getPasskeyData(accountName);
      return passkeyData !== null;
    } catch (error) {
      console.warn('Failed to check passkey existence:', error);
      // Return false if database is not accessible - assume passkey doesn't exist
      // This prevents form validation from failing during database initialization
      return false;
    }
  }

  /**
   * Check if there's any encrypted data in storage (account-aware)
   */
  hasEncryptedData(accountName?: string): boolean {
    try {
      if (accountName) {
        const stored = localStorage.getItem(`${STORAGE_KEY}_${accountName}`);
        return stored !== null && stored.length > 0;
      } else {
        // Check for any account session
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(STORAGE_KEY)) {
            return true;
          }
        }
        return false;
      }
    } catch (error) {
      console.warn('Failed to check encrypted data:', error);
      return false;
    }
  }
}

export const noteCache = new NoteCacheService();
export type { EncryptedData, StoredEncryptedData };