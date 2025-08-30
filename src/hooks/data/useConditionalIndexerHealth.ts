import { fetchLatestIndexedBlock } from "@/services/data/queryService";
import { useEffect, useState } from "react";
import { useTransactionTracking } from "../transactions/useTransactionTracking";

export function useConditionalIndexerHealth() {
  const { trackingStatus } = useTransactionTracking();
  const [indexerHealth, setIndexerHealth] = useState<boolean | null>(null);

  // Only check indexer health when transaction tracking is idle
  useEffect(() => {
    if (trackingStatus !== "idle") {
      // Reset health status when tracking is active
      setIndexerHealth(null);
      return;
    }

    const checkIndexerHealth = async () => {
      try {
        const latestBlock = await fetchLatestIndexedBlock();
        setIndexerHealth(latestBlock !== null);
      } catch (error) {
        console.error("Indexer health check failed:", error);
        setIndexerHealth(false);
      }
    };

    // Check immediately and then every 30 seconds
    checkIndexerHealth();
    const interval = setInterval(checkIndexerHealth, 30000);

    return () => clearInterval(interval);
  }, [trackingStatus]);

  return {
    indexerHealth,
    shouldShowHealth: trackingStatus === "idle",
    isHealthy: indexerHealth === true,
    isOffline: indexerHealth === false,
    isChecking: indexerHealth === null,
  };
}
