import { useState, useEffect } from 'react'
import { fetchLatestIndexedBlock } from '@/services/queryService'
import { Activity } from 'lucide-react'

export const AppBanner = () => {
  const [blockInfo, setBlockInfo] = useState<{
    blockNumber: string;
    timestamp: string;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const loadBlockInfo = async () => {
      try {
        const info = await fetchLatestIndexedBlock()
        setBlockInfo(info)
      } catch (error) {
        console.error('Failed to load indexer status:', error)
      } finally {
        setLoading(false)
      }
    }

    loadBlockInfo()
    // Refresh block info every 30 seconds
    const interval = setInterval(loadBlockInfo, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-center gap-2 text-xs text-blue-700 dark:text-blue-300">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>Checking indexer status...</span>
        </div>
      </div>
    )
  }

  if (!blockInfo) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-center gap-2 text-xs text-amber-700 dark:text-amber-300">
          <Activity className="w-4 h-4" />
          <span>Indexer status unavailable</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
      <div className="flex items-center justify-center gap-2 text-xs text-green-700 dark:text-green-300">
        <Activity className="w-4 h-4" />
        <span className="font-mono">
          Indexed to Block #{parseInt(blockInfo.blockNumber).toLocaleString()}
        </span>
      </div>
    </div>
  )
}