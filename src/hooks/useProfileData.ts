/**
 * Hook for managing user profile data with simplified IndexedDB storage
 */

import { useState, useEffect, useCallback } from 'react';
import { useSetupStore } from '../stores/setupStore';
import { CONTRACTS } from '../config/contracts';
import { depositStorage, NoteDetails, SyncResult } from '../lib/depositStorage';
import { restoreFromMnemonic } from '../utils/crypto';

export interface ProfileDataState {
  deposits: NoteDetails[];
  totalNotes: number;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  newDepositsFound: number;
}

export interface UseProfileDataResult extends ProfileDataState {
  syncData: (forceRefresh?: boolean) => Promise<void>;
  refreshData: () => Promise<void>;
}

/**
 * Hook to manage user profile data with real deposit information
 * Automatically syncs on authentication and provides manual sync methods
 */
export function useProfileData(): UseProfileDataResult {
  const { mnemonic, privateKey } = useSetupStore();
  
  const [state, setState] = useState<ProfileDataState>({
    deposits: [],
    totalNotes: 0,
    isLoading: false,
    isSyncing: false,
    error: null,
    lastSyncTime: null,
    newDepositsFound: 0,
  });

  /**
   * Sync user data using simplified storage service
   */
  const syncData = useCallback(async (forceRefresh = false) => {
    if (!mnemonic && !privateKey) {
      return;
    }

    const accountKey = getAccountKey(mnemonic || undefined, privateKey || undefined);
    if (!accountKey) {
      setState(prev => ({
        ...prev,
        error: 'Failed to get account key for sync',
      }));
      return;
    }

    setState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const syncResult: SyncResult = await depositStorage.discoverAndStoreDeposits(
        accountKey,
        CONTRACTS.ETH_PRIVACY_POOL,
        forceRefresh
      );

      setState(prev => ({
        ...prev,
        deposits: syncResult.deposits,
        totalNotes: syncResult.totalNotes,
        newDepositsFound: syncResult.newDepositsFound,
        isSyncing: false,
        lastSyncTime: new Date(syncResult.syncTime),
      }));
    } catch (error) {
      console.error('Failed to sync user data:', error);
      setState(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Failed to sync data',
      }));
    }
  }, [mnemonic, privateKey]);

  /**
   * Refresh data (force refresh from chain)
   */
  const refreshData = useCallback(() => syncData(true), [syncData]);

  /**
   * Auto-sync on authentication (privacy-preserving)
   */
  useEffect(() => {
    if (mnemonic || privateKey) {
      syncData();
    }
  }, [mnemonic, privateKey, syncData]);

  return {
    ...state,
    syncData,
    refreshData,
  };
}

/**
 * Helper hook to get cash note data with real deposit information
 */
export function useCashNoteData() {
  const { mnemonic, privateKey } = useSetupStore();
  const profileData = useProfileData();

  const generateCashNoteWithStatus = useCallback((noteIndex: number) => {
    if (!mnemonic && !privateKey) return null;

    // Find matching deposit data for this note index
    const depositData = profileData.deposits.find(
      deposit => deposit.noteIndex === noteIndex
    );

    return {
      noteIndex,
      hasDeposit: !!depositData,
      depositData: depositData || null,
    };
  }, [mnemonic, privateKey, profileData.deposits]);

  return {
    ...profileData,
    generateCashNoteWithStatus,
  };
}

/**
 * Get account key from mnemonic or private key
 */
function getAccountKey(mnemonic?: string[], privateKey?: string): string | null {
  if (privateKey) {
    return privateKey;
  } else if (mnemonic) {
    try {
      const restoredKeys = restoreFromMnemonic(mnemonic);
      return restoredKeys.privateKey;
    } catch (error) {
      console.error('Failed to restore private key from mnemonic:', error);
      return null;
    }
  }
  return null;
}