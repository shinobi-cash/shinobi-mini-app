import { Dot } from 'lucide-react'
import { useTransactionTracking, TransactionTrackingProvider } from '@/hooks/transactions/useTransactionTracking'
import { useConditionalIndexerHealth } from '@/hooks/data/useConditionalIndexerHealth'
import { useBanner } from '@/contexts/BannerContext'

// Re-export the provider for convenience
export { TransactionTrackingProvider }

export const AppBanner = () => {
  const { trackingStatus, trackedTxHash } = useTransactionTracking()
  const { currentBanner, dismissBanner } = useBanner()
  const { indexerHealth } = useConditionalIndexerHealth()

  // Show current banner if one exists
  if (currentBanner) {
    const getBannerStyles = (type: string) => {
      switch (type) {
        case 'success':
          return {
            bg: 'bg-green-50 dark:bg-green-900/20',
            border: 'border-green-200 dark:border-green-800',
            text: 'text-green-700 dark:text-green-300'
          };
        case 'error':
          return {
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-200 dark:border-red-800',
            text: 'text-red-700 dark:text-red-300'
          };
        case 'warning':
          return {
            bg: 'bg-yellow-50 dark:bg-yellow-900/20',
            border: 'border-yellow-200 dark:border-yellow-800',
            text: 'text-yellow-700 dark:text-yellow-300'
          };
        case 'info':
          return {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-200 dark:border-blue-800',
            text: 'text-blue-700 dark:text-blue-300'
          };
        default:
          return {
            bg: 'bg-gray-50 dark:bg-gray-800/20',
            border: 'border-gray-200 dark:border-gray-700',
            text: 'text-gray-600 dark:text-gray-400'
          };
      }
    };

    const styles = getBannerStyles(currentBanner.type);

    return (
      <div className={`${styles.bg} border-b ${styles.border}`}>
        <div 
          className={`flex items-center justify-center gap-1 text-[10px] ${styles.text} font-mono cursor-pointer`}
          onClick={dismissBanner}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && dismissBanner()}
        >
          <div className="w-1 h-1 bg-current rounded-full" />
          {currentBanner.message}
        </div>
      </div>
    );
  }

  // Fall back to transaction tracking or system status
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

  if (indexerHealth === false) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
        <div className="flex items-center justify-center gap-1 text-[10px] text-red-700 dark:text-red-300 font-mono">
          <Dot className="w-3 h-3" />
          Indexer offline
        </div>
      </div>
    )
  }

  // Default state
  return (
    <div className="bg-gray-50 dark:bg-gray-800/20 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-center gap-1 text-[10px] text-gray-600 dark:text-gray-400 font-mono">
        <Dot className="w-3 h-3" />
        Base Sepolia
      </div>
    </div>
  )
}