/**
 * Refactored Note Discovery Hook
 * Separates React state management from storage and business logic
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { DiscoveryResult } from "@/lib/storage-refactored/interfaces/IDataTypes";
import { NoteDiscoveryService, type DiscoveryProgress } from "@/lib/services-refactored/NoteDiscoveryService";
import { StorageProviderAdapter } from "@/lib/services-refactored/adapters/StorageProviderAdapter";

// Create service instances
const storageProvider = new StorageProviderAdapter();
const discoveryService = new NoteDiscoveryService(storageProvider);

export interface UseNoteDiscoveryResult {
  data: DiscoveryResult | null;
  loading: boolean;
  error: Error | null;
  progress: DiscoveryProgress | null;
  refresh: () => Promise<DiscoveryResult>;
}

export interface UseNoteDiscoveryOptions {
  autoScan?: boolean;
}

/**
 * Hook for note discovery with decoupled storage and business logic
 */
export function useNoteDiscovery(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint,
  options?: UseNoteDiscoveryOptions
): UseNoteDiscoveryResult {
  const [data, setData] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<DiscoveryProgress | null>(null);

  const refreshIdRef = useRef(0);

  const runDiscovery = useCallback(
    async (signal?: AbortSignal, onProgress?: (p: DiscoveryProgress) => void) => {
      return discoveryService.discoverNotes(publicKey, poolAddress, accountKey, { signal, onProgress });
    },
    [publicKey, poolAddress, accountKey]
  );

  useEffect(() => {
    const autoScan = options?.autoScan ?? true;

    // Load cache first
    const loadCache = async () => {
      try {
        const cached = await storageProvider.getCachedNotes(publicKey, poolAddress);
        if (cached) {
          setData(cached);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load cached notes:", error);
      }
    };

    loadCache();

    if (!autoScan) return;

    const controller = new AbortController();
    const signal = controller.signal;
    const runId = ++refreshIdRef.current;

    const onProgress = (p: DiscoveryProgress) => {
      if (runId === refreshIdRef.current) setProgress(p);
    };

    runDiscovery(signal, onProgress)
      .then((result) => {
        if (runId === refreshIdRef.current) setData(result);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (runId === refreshIdRef.current) setError(err as Error);
      })
      .finally(() => {
        if (runId === refreshIdRef.current) setLoading(false);
      });

    return () => controller.abort();
  }, [poolAddress, publicKey, runDiscovery, options?.autoScan]);

  const refresh = useCallback(async () => {
    const runId = ++refreshIdRef.current;
    const controller = new AbortController();
    const signal = controller.signal;

    setLoading(true);
    setError(null);

    const onProgress = (p: DiscoveryProgress) => {
      if (runId === refreshIdRef.current) setProgress(p);
    };

    try {
      const result = await runDiscovery(signal, onProgress);
      if (runId === refreshIdRef.current) setData(result);
      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (runId === refreshIdRef.current) setError(err as Error);
      throw err;
    } finally {
      if (runId === refreshIdRef.current) setLoading(false);
    }
  }, [runDiscovery]);

  return { data, loading, error, progress, refresh };
}

/**
 * Legacy hook name for backward compatibility
 */
export { useNoteDiscovery as useNotes };