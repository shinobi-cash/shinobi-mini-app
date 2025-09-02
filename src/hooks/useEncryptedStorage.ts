/**
 * Encrypted Storage Hook
 * Manages session state and automatic timeout with user activity tracking
 */

import { useCallback, useEffect, useState } from "react";
import { storageManager } from "@/lib/storage";

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
    error: null,
  });

  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Clear session automatically after timeout - exact logic from original
  const clearSession = useCallback(() => {
    storageManager.clearSession();
    setState((prev) => ({
      ...prev,
      isSessionActive: false,
      error: null,
    }));

    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      setSessionTimeout(null);
    }
  }, [sessionTimeout]);

  // Clear all data including passkeys - exact logic from original
  const clearAllData = useCallback(async () => {
    try {
      await storageManager.clearAllData();
      clearSession();
    } catch (error) {
      console.error("Failed to clear all data:", error);
    }
  }, [clearSession]);

  // Reset session timeout - exact logic from original
  const resetSessionTimeout = useCallback(() => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }

    const timeout = setTimeout(() => {
      clearSession();
    }, SESSION_TIMEOUT);

    setSessionTimeout(timeout);
  }, [sessionTimeout, clearSession]);

  // Reset session timeout on user activity - exact logic from original
  useEffect(() => {
    if (state.isSessionActive) {
      const handleUserActivity = () => {
        resetSessionTimeout();
      };

      const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
      for (const event of events) {
        document.addEventListener(event, handleUserActivity, true);
      }

      return () => {
        for (const event of events) {
          document.removeEventListener(event, handleUserActivity, true);
        }
      };
    }
  }, [state.isSessionActive, resetSessionTimeout]);

  // Cleanup timeout on unmount - exact logic from original
  useEffect(() => {
    return () => {
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, [sessionTimeout]);

  // Check if there's any encrypted data in storage - exact logic from original
  const hasEncryptedData = useCallback((): boolean => {
    return storageManager.hasEncryptedData();
  }, []);

  return {
    ...state,
    clearSession,
    clearAllData,
    hasEncryptedData,
  };
}

// Helper hook for components that need encrypted session - exact logic from original
export function useRequireEncryptedSession() {
  const storage = useEncryptedStorage();

  useEffect(() => {
    if (storage.isInitialized && !storage.isSessionActive && !storage.isLoading) {
      console.warn("Encrypted session required but not active");
    }
  }, [storage.isInitialized, storage.isSessionActive, storage.isLoading]);

  return storage;
}
