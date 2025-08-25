/**
 * React Hook for managing encrypted local storage session
 * Handles password-based encryption/decryption of sensitive note data
 */

import { useState, useEffect, useCallback } from 'react';
import { noteCache } from "@/lib/storage/noteCache";

interface EncryptedStorageState {
  isSessionActive: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

interface EncryptedStorageActions {
  clearSession: () => void;
  clearAllData: () => Promise<void>;
  hasEncryptedData: () => boolean;
}

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function useEncryptedStorage(): EncryptedStorageState & EncryptedStorageActions {
  const [state, setState] = useState<EncryptedStorageState>({
    isSessionActive: false,
    isInitialized: false,
    isLoading: false,
    error: null
  });

  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Clear session automatically after timeout
  const clearSession = useCallback(() => {
    noteCache.clearSession();
    setState(prev => ({
      ...prev,
      isSessionActive: false,
      error: null
    }));
    
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      setSessionTimeout(null);
    }
  }, [sessionTimeout]);

  // Clear all data including passkeys (for reset/logout)
  const clearAllData = useCallback(async () => {
    try {
      await noteCache.clearAllData();
      clearSession();
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  }, [clearSession]);


  // Reset session timeout
  const resetSessionTimeout = useCallback(() => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    
    const timeout = setTimeout(() => {
      clearSession();
    }, SESSION_TIMEOUT);
    
    setSessionTimeout(timeout);
  }, [sessionTimeout, clearSession]);



  // Reset session timeout on user activity
  useEffect(() => {
    if (state.isSessionActive) {
      const handleUserActivity = () => {
        resetSessionTimeout();
      };

      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, true);
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleUserActivity, true);
        });
      };
    }
  }, [state.isSessionActive, resetSessionTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, [sessionTimeout]);

  // Check if there's any encrypted data in storage
  const hasEncryptedData = useCallback((): boolean => {
    try {
      return noteCache.hasEncryptedData();
    } catch (error) {
      console.warn('Failed to check encrypted data:', error);
      return false;
    }
  }, []);

  return {
    ...state,
    clearSession,
    clearAllData,
    hasEncryptedData
  };
}

// Helper hook for components that need encrypted storage
export function useRequireEncryptedSession() {
  const storage = useEncryptedStorage();
  
  useEffect(() => {
    if (storage.isInitialized && !storage.isSessionActive && !storage.isLoading) {
      // Redirect to password prompt or show modal
      console.warn('Encrypted session required but not active');
    }
  }, [storage.isInitialized, storage.isSessionActive, storage.isLoading]);
  
  return storage;
}