import { type DiscoveryResult, noteCache } from "@/lib/storage/noteCache";
import { useEffect, useState } from "react";

export function useCachedNotes(publicKey: string, poolAddress: string) {
  const [data, setData] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await noteCache.getCachedNotes(publicKey, poolAddress);
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
