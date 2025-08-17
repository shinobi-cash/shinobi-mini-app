/**
 * Simplified deposit storage with IndexedDB + discovery
 * Single responsibility: manage all deposit data operations
 */

import { checkNotePrecommitmentExists, fetchDepositByPrecommitment } from './apollo';
import { deriveNullifier, deriveSecret, generatePrecommitment } from '../hooks/useDepositCommitment';
import { formatEther } from 'viem';

// Types
export interface NoteDetails {
  noteIndex: number;
  amount: string; // in ETH
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
  status: 'deposited' | 'spent';
  precommitmentHash: string;
  discoveredAt: number;
}

export interface PoolData {
  poolAddress: string;
  accountId: string; // Safe public identifier (NOT private key)
  notes: NoteDetails[];
  lastUsedNoteIndex: number;
  lastSyncTime: number;
  totalNotes: number;
}

export interface SyncResult {
  totalNotes: number;
  deposits: NoteDetails[];
  lastSyncedIndex: number;
  newDepositsFound: number;
  syncTime: number;
}

// IndexedDB setup
const DB_NAME = 'shinobi.cash';
const DB_VERSION = 1;
const STORE_NAME = 'account-note-data';

class DepositStorageService {
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
   * Main function: discover deposits and store them
   * Returns cached data if recent, otherwise performs fresh discovery
   */
  async discoverAndStoreDeposits(
    accountKey: string,
    poolAddress: string,
    forceRefresh = false
  ): Promise<SyncResult> {
    if (!this.db) await this.init();

    try {
      // Generate safe account ID (never store the private key)
      const accountId = this.generateAccountId(accountKey);

      // Check cached data first
      if (!forceRefresh) {
        const cached = await this.getCachedData(accountId, poolAddress);
        if (cached && this.isCacheValid(cached.lastSyncTime)) {
          return {
            totalNotes: cached.totalNotes,
            deposits: cached.notes,
            lastSyncedIndex: cached.lastUsedNoteIndex,
            newDepositsFound: 0,
            syncTime: cached.lastSyncTime,
          };
        }
      }

      // Perform fresh discovery
      const discoveredNotes = await this.performDiscovery(accountKey, poolAddress);
      
      // Store results using safe account ID
      const lastSyncedIndex = discoveredNotes.length > 0 
        ? Math.max(...discoveredNotes.map(note => note.noteIndex))
        : -1;

      await this.storeData(accountId, poolAddress, discoveredNotes, lastSyncedIndex);

      return {
        totalNotes: discoveredNotes.length,
        deposits: discoveredNotes,
        lastSyncedIndex,
        newDepositsFound: discoveredNotes.length, // For simplicity, consider all as new on fresh discovery
        syncTime: Date.now(),
      };

    } catch (error) {
      console.error('Failed to discover deposits:', error);
      
      // Return cached data as fallback
      const accountId = this.generateAccountId(accountKey);
      const cached = await this.getCachedData(accountId, poolAddress);
      if (cached) {
        return {
          totalNotes: cached.totalNotes,
          deposits: cached.notes,
          lastSyncedIndex: cached.lastUsedNoteIndex,
          newDepositsFound: 0,
          syncTime: cached.lastSyncTime,
        };
      }

      // Return empty result if no cache
      return {
        totalNotes: 0,
        deposits: [],
        lastSyncedIndex: -1,
        newDepositsFound: 0,
        syncTime: Date.now(),
      };
    }
  }

  /**
   * Perform sequential discovery by checking precommitments
   */
  private async performDiscovery(accountKey: string, poolAddress: string): Promise<NoteDetails[]> {
    const discoveredNotes: NoteDetails[] = [];
    let noteIndex = 0;
    const maxSearchIndex = 1000;

    while (noteIndex < maxSearchIndex) {
      try {
        // Generate precommitment for this note index
        const nullifier = deriveNullifier(accountKey, poolAddress, noteIndex);
        const secret = deriveSecret(accountKey, poolAddress, noteIndex);
        const precommitment = generatePrecommitment(nullifier, secret);

        // Check if exists on-chain
        const exists = await checkNotePrecommitmentExists(precommitment);
        
        if (!exists) {
          break; // Found first unused index
        }

        // Fetch deposit data
        const depositData = await fetchDepositByPrecommitment(precommitment);
        
        if (depositData) {
          const amount = depositData.amount || depositData.originalAmount || '0';
          
          discoveredNotes.push({
            noteIndex,
            amount: formatEther(BigInt(amount)),
            transactionHash: depositData.transactionHash || 'unknown',
            blockNumber: depositData.blockNumber || 'unknown',
            timestamp: depositData.timestamp || Date.now().toString(),
            status: 'deposited',
            precommitmentHash: depositData.precommitmentHash,
            discoveredAt: Date.now(),
          });
        }

        noteIndex++;
      } catch (error) {
        console.error(`Error checking note index ${noteIndex}:`, error);
        noteIndex++;
      }
    }

    return discoveredNotes;
  }

  /**
   * Store data in IndexedDB (NEVER stores private keys)
   */
  private async storeData(
    accountId: string,
    poolAddress: string,
    notes: NoteDetails[],
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
  private async getCachedData(accountId: string, poolAddress: string): Promise<PoolData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(this.getKey(accountId, poolAddress));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const { id, ...poolData } = result;
          resolve(poolData as PoolData);
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
export const depositStorage = new DepositStorageService();