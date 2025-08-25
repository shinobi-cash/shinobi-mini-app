import { useState, useEffect, createContext, useContext } from 'react'
import { fetchLatestIndexedBlock } from '@/services/queryService'
import { Dot } from 'lucide-react'

// Context for tracking user transactions
interface TransactionTrackingContextType {
  trackTransaction: (txHash: string) => void;
  trackingStatus: 'idle' | 'waiting' | 'synced';
  trackedTxHash: string | null;
}

const TransactionTrackingContext = createContext<TransactionTrackingContextType | null>(null)

export const useTransactionTracking = () => {
  const context = useContext(TransactionTrackingContext)
  if (!context) {
    throw new Error('useTransactionTracking must be used within TransactionTrackingProvider')
  }
  return context
}

// Provider component to wrap the app
export const TransactionTrackingProvider = ({ children }: { children: React.ReactNode }) => {
  const [trackingStatus, setTrackingStatus] = useState<'idle' | 'waiting' | 'synced'>('idle')
  const [trackedTxHash, setTrackedTxHash] = useState<string | null>(null)
  const [txBlockNumber, setTxBlockNumber] = useState<number | null>(null)

  const trackTransaction = (txHash: string) => {
    setTrackedTxHash(txHash)
    setTxBlockNumber(null)
    setTrackingStatus('waiting')
    // Clear tracking after 5 minutes
    setTimeout(() => {
      setTrackedTxHash(null)
      setTxBlockNumber(null)
      setTrackingStatus('idle')
    }, 5 * 60 * 1000)
  }

  // Fetch transaction receipt with retry until we get it
  useEffect(() => {
    if (!trackedTxHash || trackingStatus !== 'waiting' || txBlockNumber !== null) return

    const fetchTransactionReceipt = async () => {
      try {
        const response = await fetch(`https://sepolia.base.org`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionReceipt',
            params: [trackedTxHash],
            id: 1
          })
        })
        
        const rpcResult = await response.json()
        if (rpcResult.result) {
          const blockNumber = parseInt(rpcResult.result.blockNumber, 16)
          setTxBlockNumber(blockNumber)
        } else {
          // Receipt not available yet, retry in 3 seconds
          setTimeout(fetchTransactionReceipt, 3000)
        }
      } catch (error) {
        console.error('Failed to fetch transaction receipt:', error)
        // Retry after error in 5 seconds
        setTimeout(fetchTransactionReceipt, 5000)
      }
    }

    fetchTransactionReceipt()
  }, [trackedTxHash, trackingStatus, txBlockNumber])

  // Check if tracked transaction is indexed (only after we have block number)
  useEffect(() => {
    if (!trackedTxHash || trackingStatus !== 'waiting' || txBlockNumber === null) return

    const checkTransactionIndexed = async () => {
      try {
        // Check if this block is indexed by our indexer
        const indexedBlockInfo = await fetchLatestIndexedBlock()
        if (indexedBlockInfo && parseInt(indexedBlockInfo.blockNumber) >= txBlockNumber) {
          setTrackingStatus('synced')
          // Clear after 10 seconds
          setTimeout(() => {
            setTrackedTxHash(null)
            setTxBlockNumber(null)
            setTrackingStatus('idle')
          }, 10000)
        }
        
      } catch (error) {
        console.error('Failed to check transaction status:', error)
      }
    }

    // Check immediately, then every 5 seconds
    checkTransactionIndexed()
    const interval = setInterval(checkTransactionIndexed, 5000)
    return () => clearInterval(interval)
  }, [trackedTxHash, trackingStatus, txBlockNumber])

  return (
    <TransactionTrackingContext.Provider value={{ trackTransaction, trackingStatus, trackedTxHash }}>
      {children}
    </TransactionTrackingContext.Provider>
  )
}

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