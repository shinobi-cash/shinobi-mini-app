/**
 * Note Cache Service - IndexedDB operations only
 * Single responsibility: cache discovered note data
 */

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
}

export interface DiscoveryResult {
  notes: NoteChain[];
  lastUsedIndex: number;
  newNotesFound: number;
  syncTime: number;
}

// IndexedDB setup
const DB_NAME = 'shinobi.cash';
const DB_VERSION = 3; // Incremented for clean migration
const STORE_NAME = 'account-note-data';

class NoteCacheService {
  private db: IDBDatabase | null = null;

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
        
        // Clean migration: drop old store if it exists
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        
        // Create new store with publicKey-based indexing
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('publicKey', 'publicKey', { unique: false });
        store.createIndex('poolAddress', 'poolAddress', { unique: false });
      };
    });
  }

  private getKey(publicKey: string, poolAddress: string): string {
    return `${publicKey.toLowerCase()}_${poolAddress.toLowerCase()}`;
  }

  async getCachedNotes(publicKey: string, poolAddress: string): Promise<DiscoveryResult | null> {
    if (!this.db) await this.init();

    const cached = await this.getCachedData(publicKey, poolAddress);

    if (cached) {
      return {
        notes: cached.notes,
        lastUsedIndex: cached.lastUsedDepositIndex,
        newNotesFound: 0,
        syncTime: cached.lastSyncTime,
      };
    }

    return null;
  }

  async storeDiscoveredNotes(
    publicKey: string,
    poolAddress: string,
    notes: NoteChain[]
  ): Promise<void> {
    if (!this.db) await this.init();

    const lastUsedIndex = notes.length > 0
      ? Math.max(...notes.map(chain => chain[0].depositIndex))
      : -1;

    await this.storeData(publicKey, poolAddress, notes, lastUsedIndex);
  }

  private async storeData(
    publicKey: string,
    poolAddress: string,
    notes: NoteChain[],
    lastUsedDepositIndex: number
  ): Promise<void> {
    if (!this.db) await this.init();

    const data = {
      id: this.getKey(publicKey, poolAddress),
      poolAddress,
      publicKey,
      notes,
      lastUsedDepositIndex,
      lastSyncTime: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async getCachedData(publicKey: string, poolAddress: string): Promise<CachedNoteData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(this.getKey(publicKey, poolAddress));

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
   * Retrieves the next available deposit index from the cache.
   * This is used to generate a new, unique deposit commitment.
   */
  async getNextDepositIndex(publicKey: string, poolAddress: string): Promise<number> {
    const cached = await this.getCachedData(publicKey, poolAddress);
    return cached ? cached.lastUsedDepositIndex + 1 : 0;
  }

  /**
   * Updates the last used deposit index in the cache.
   * This is called after a unique deposit commitment is successfully generated.
   */
  async updateLastUsedDepositIndex(
    publicKey: string,
    poolAddress: string,
    depositIndex: number
  ): Promise<void> {
    const cached = await this.getCachedData(publicKey, poolAddress);

    const notes = cached ? cached.notes : [];
    const lastUsedIndex = cached ? Math.max(cached.lastUsedDepositIndex, depositIndex) : depositIndex;

    await this.storeData(publicKey, poolAddress, notes, lastUsedIndex);
  }
}

export const noteCache = new NoteCacheService();