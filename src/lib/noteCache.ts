/**
 * Note Cache Service - IndexedDB operations only
 * Single responsibility: cache discovered note data
 */

// Types for discovered notes
export interface DiscoveredNote {
  noteIndex: number;
  amount: string; // in ETH
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
  status: 'unspent' | 'spent';
  precommitmentHash: string;
  commitment: string;
  label: string;
  discoveredAt: number;
}

export interface CachedNoteData {
  poolAddress: string;
  accountId: string; // Safe public identifier (NOT private key)
  notes: DiscoveredNote[];
  lastUsedNoteIndex: number;
  lastSyncTime: number;
  totalNotes: number;
}

export interface DiscoveryResult {
  notes: DiscoveredNote[];
  lastUsedIndex: number;
  newNotesFound: number;
  syncTime: number;
}

// IndexedDB setup
const DB_NAME = 'shinobi.cash';
const DB_VERSION = 1;
const STORE_NAME = 'account-note-data';

class NoteCacheService {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('accountId', 'accountId', { unique: false });
          store.createIndex('poolAddress', 'poolAddress', { unique: false });
        }
      };
    });
  }

  /**
   * Get composite key for storage using safe account ID
   */
  private getKey(accountId: string, poolAddress: string): string {
    return `${accountId}_${poolAddress}`;
  }

  /**
   * Generate safe account ID from private key (for storage only)
   * Uses hash to avoid storing the actual private key
   */
  private generateAccountId(accountKey: string): string {
    // Create a safe identifier by hashing the private key
    // This allows us to uniquely identify the account without storing the private key
    const encoder = new TextEncoder();
    const data = encoder.encode(accountKey);
    
    // Simple hash function (for demo - in production use crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `acc_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Get cached data if valid, otherwise return null
   */
  async getCachedNotes(accountKey: string, poolAddress: string): Promise<DiscoveryResult | null> {
    if (!this.db) await this.init();

    const accountId = this.generateAccountId(accountKey);
    const cached = await this.getCachedData(accountId, poolAddress);
    
    if (cached && this.isCacheValid(cached.lastSyncTime)) {
      return {
        notes: cached.notes,
        lastUsedIndex: cached.lastUsedNoteIndex,
        newNotesFound: 0,
        syncTime: cached.lastSyncTime,
      };
    }
    
    return null;
  }

  /**
   * Store discovered notes in cache
   */
  async storeDiscoveredNotes(
    accountKey: string, 
    poolAddress: string, 
    notes: DiscoveredNote[]
  ): Promise<void> {
    if (!this.db) await this.init();

    const accountId = this.generateAccountId(accountKey);
    const lastUsedIndex = notes.length > 0 
      ? Math.max(...notes.map(note => note.noteIndex))
      : -1;

    await this.storeData(accountId, poolAddress, notes, lastUsedIndex);
  }


  /**
   * Store data in IndexedDB (NEVER stores private keys)
   */
  private async storeData(
    accountId: string,
    poolAddress: string,
    notes: DiscoveredNote[],
    lastUsedNoteIndex: number
  ): Promise<void> {
    if (!this.db) await this.init();

    const data = {
      id: this.getKey(accountId, poolAddress),
      poolAddress,
      accountId, // Safe public identifier (NOT private key)
      notes,
      lastUsedNoteIndex,
      lastSyncTime: Date.now(),
      totalNotes: notes.length,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get cached data
   */
  private async getCachedData(accountId: string, poolAddress: string): Promise<CachedNoteData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(this.getKey(accountId, poolAddress));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const { id, ...noteData } = result;
          resolve(noteData as CachedNoteData);
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * Check if cache is valid (5 minutes)
   */
  private isCacheValid(lastSyncTime: number): boolean {
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - lastSyncTime < fiveMinutes;
  }

  /**
   * Get next available note index
   */
  async getNextNoteIndex(accountKey: string, poolAddress: string): Promise<number> {
    const accountId = this.generateAccountId(accountKey);
    const cached = await this.getCachedData(accountId, poolAddress);
    return cached ? cached.lastUsedNoteIndex + 1 : 0;
  }

  /**
   * Update last used note index
   */
  async updateLastUsedNoteIndex(
    accountKey: string,
    poolAddress: string,
    noteIndex: number
  ): Promise<void> {
    const accountId = this.generateAccountId(accountKey);
    const cached = await this.getCachedData(accountId, poolAddress);
    
    if (cached) {
      cached.lastUsedNoteIndex = Math.max(cached.lastUsedNoteIndex, noteIndex);
      await this.storeData(accountId, poolAddress, cached.notes, cached.lastUsedNoteIndex);
    }
  }
}

// Export singleton
export const noteCache = new NoteCacheService();