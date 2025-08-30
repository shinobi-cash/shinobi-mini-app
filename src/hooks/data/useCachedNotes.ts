import { useEffect, useMemo, useState } from "react";
import { DiscoveryResult, noteCache } from "@/lib/storage/noteCache";

export function useCachedNotes(publicKey: string, poolAddress: string, accountKey: bigint) {
  const [data, setData] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Stable string key
  const accountKeyString = useMemo(() => accountKey.toString(), [accountKey]);

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
  }, [publicKey, poolAddress, accountKeyString]);

  return { data, loading };
}
