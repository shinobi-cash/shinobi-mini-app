import { useState, useEffect } from 'react';
import { fetchLatestIndexedBlock } from "@/services/data/queryService";

export type IndexerHealthStatus = boolean | null; // true = healthy, false = offline, null = checking

export function useIndexerHealth() {
  const [indexerHealth, setIndexerHealth] = useState<IndexerHealthStatus>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Check indexer health
  const checkIndexerHealth = async (): Promise<void> => {
    try {
      const latestBlock = await fetchLatestIndexedBlock();
      const isHealthy = latestBlock !== null;
      setIndexerHealth(isHealthy);
      setLastChecked(new Date());
      
      console.log('Indexer health check:', {
        healthy: isHealthy,
        latestBlock,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Indexer health check failed:', error);
      setIndexerHealth(false);
      setLastChecked(new Date());
    }
  };

  // Periodic health check (30 seconds interval)
  useEffect(() => {
    // Initial check
    checkIndexerHealth();
    
    // Set up periodic checks
    const interval = setInterval(checkIndexerHealth, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Manual refresh function
  const refreshHealth = () => {
    setIndexerHealth(null); // Set to checking state
    checkIndexerHealth();
  };

  return {
    indexerHealth,
    lastChecked,
    isHealthy: indexerHealth === true,
    isOffline: indexerHealth === false,
    isChecking: indexerHealth === null,
    refreshHealth,
    checkIndexerHealth
  };
}