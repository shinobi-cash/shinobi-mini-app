/**
 * Refactored Cached Notes Hook
 * Decoupled from direct storage access, uses storage provider interface
 */

import { useEffect, useState } from "react";
import type { DiscoveryResult } from "@/lib/storage/interfaces/IDataTypes";
import { StorageProviderAdapter } from "@/lib/services/adapters/StorageProviderAdapter";

// Create storage provider instance
const storageProvider = new StorageProviderAdapter();

export function useCachedNotes(publicKey: string, poolAddress: string) {
  const [data, setData] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await storageProvider.getCachedNotes(publicKey, poolAddress);
        setData(cached);
      } catch (error) {
        console.error("Failed to load cached notes:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCache();
  }, [publicKey, poolAddress]);

  return { data, loading };
}