import { useState, useEffect } from 'react'
import { fetchLatestIndexedBlock } from '@/services/queryService'
import { Dot } from 'lucide-react'
import { useTransactionTracking, TransactionTrackingProvider } from '@/hooks/useTransactionTracking'

// Re-export the provider for convenience
export { TransactionTrackingProvider }

export const AppBanner = () => {
  const { trackingStatus, trackedTxHash } = useTransactionTracking()
  const [indexerHealth, setIndexerHealth] = useState<boolean | null>(null)

  // Periodic health check for indexer status (only when idle)
  useEffect(() => {
    if (trackingStatus !== 'idle') return

    const checkIndexerHealth = async () => {
      try {
        const latestBlock = await fetchLatestIndexedBlock()
        setIndexerHealth(latestBlock !== null)
      } catch (error) {
        console.error('Indexer health check failed:', error)
        setIndexerHealth(false)
      }
    }

    checkIndexerHealth()
    const interval = setInterval(checkIndexerHealth, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [trackingStatus])

  // Show transaction tracking status when actively tracking
  if (trackingStatus === 'waiting') {
    const shortHash = trackedTxHash ? `${trackedTxHash.slice(0, 6)}...${trackedTxHash.slice(-4)}` : '';
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-center gap-1 text-[10px] text-blue-700 dark:text-blue-300 font-mono">
          <Dot className="w-3 h-3 animate-pulse" />
          {shortHash} • Waiting for indexing...
        </div>
      </div>
    )
  }

  if (trackingStatus === 'synced') {
    const shortHash = trackedTxHash ? `${trackedTxHash.slice(0, 6)}...${trackedTxHash.slice(-4)}` : '';
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
        <div className="flex items-center justify-center gap-1 text-[10px] text-green-700 dark:text-green-300 font-mono">
          <Dot className="w-3 h-3" />
          {shortHash} • Indexed!
        </div>
      </div>
    )
  }

  // Show indexer health status when idle
  if (indexerHealth === false) {
    // Show warning when indexer is unhealthy
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
        <div className="flex items-center justify-center gap-1 text-[10px] text-red-700 dark:text-red-300 font-mono">
          <Dot className="w-3 h-3" />
          Indexer offline
        </div>
      </div>
    )
  }

  // Default state - show chain name
  return (
    <div className="bg-gray-50 dark:bg-gray-800/20 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-center gap-1 text-[10px] text-gray-600 dark:text-gray-400 font-mono">
        <Dot className="w-3 h-3" />
        Base Sepolia
      </div>
    </div>
  )
}