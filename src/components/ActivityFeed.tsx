import { Activity } from '../types/activity'
import { ActivityRow } from './ActivityRow'
import { ActivityDetailDrawer } from './ActivityDetailDrawer'
import { useState, useRef, useEffect } from 'react'
import { formatEthAmount } from '@/utils/formatters'
import { RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { fetchPoolStats } from '@/services/queryService'

export interface ActivityFeedProps {
  activities: Activity[]
  loading?: boolean
  error?: string
  hasNextPage?: boolean
  onFetchMore?: () => Promise<any>
  onRefresh?: () => Promise<any>
}

export const ActivityFeed = ({
  activities,
  loading,
  error,
  onFetchMore,
  hasNextPage,
  onRefresh,
}: ActivityFeedProps) => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [poolStats, setPoolStats] = useState<{
    totalDeposits: string;
    totalWithdrawals: string;
    memberCount: number;
    createdAt: string;
  } | null>(null)
  const [poolStatsLoading, setPoolStatsLoading] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Fetch pool stats using the service
  const loadPoolStats = async () => {
    setPoolStatsLoading(true)
    try {
      const stats = await fetchPoolStats()
      setPoolStats(stats)
    } catch (error) {
      console.error('Failed to load pool stats:', error)
    } finally {
      setPoolStatsLoading(false)
    }
  }

  // Load pool stats on mount
  useEffect(() => {
    loadPoolStats()
  }, [])

  // Use accurate total from indexer pool stats
  const totalDeposits = poolStats?.totalDeposits ? BigInt(poolStats.totalDeposits) : 0n
  const memberCount = poolStats?.memberCount || 0

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity)
    setDrawerOpen(true)
  }

  // Infinite scroll
  useEffect(() => {
    if (!onFetchMore || !hasNextPage) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingMore) {
        setIsFetchingMore(true)
        onFetchMore()
          .finally(() => setIsFetchingMore(false))
      }
    })
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [onFetchMore, hasNextPage, isFetchingMore])

  // Pull-to-refresh (overscroll detection)
  useEffect(() => {
    if (!onRefresh) return
    let startY = 0
    let pulling = false

    const handleTouchStart = (e: TouchEvent) => {
      if ((scrollContainerRef.current?.scrollTop || 0) === 0) {
        startY = e.touches[0].clientY
        pulling = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling) return
      const diff = e.touches[0].clientY - startY
      if (diff > 50 && !isRefreshing) {
        setIsRefreshing(true)
        onRefresh()
          .finally(() => setIsRefreshing(false))
        pulling = false
      }
    }

    const handleTouchEnd = () => {
      pulling = false
    }

    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onRefresh, isRefreshing])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Total Deposits */}
      <div className="flex-shrink-0">
        <div className="bg-app-surface p-5 border border-app shadow-md">
          <div className="text-center">
            <h3 className="text-base font-semibold text-app-secondary mb-2">Total Deposits</h3>
            <p className="text-3xl font-bold text-app-primary tabular-nums mb-2">
              {poolStatsLoading ? '...' : `${formatEthAmount(totalDeposits)} ETH`}
            </p>
            <p className="text-base text-app-tertiary">
              {poolStatsLoading ? '...' : `${memberCount} member${memberCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Activities */}
      <div className="flex-1 flex flex-col min-h-0 gap-2">
        <div className="flex-shrink-0 bg-app-surface border-b border-app shadow-md">
          <div className="flex items-center justify-between py-3 px-4">
            <h2 className="text-lg font-semibold text-app-secondary tracking-tight flex-1 text-center">
              Activities
            </h2>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsRefreshing(true)
                  Promise.all([
                    onRefresh(),
                    loadPoolStats()
                  ]).finally(() => setIsRefreshing(false))
                }}
                disabled={isRefreshing || loading}
                className="h-8 w-8 p-0 text-app-secondary hover:text-app-primary"
                title="Refresh activities and pool stats"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-app-surface border border-app shadow-md overflow-hidden">
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
            {isRefreshing && (
              <div className="text-center py-2 text-app-tertiary text-sm">Refreshing...</div>
            )}

            {loading && activities.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-app-secondary">Loading activities...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-app-secondary mb-1">{error}</p>
                  <p className="text-sm text-app-tertiary">Check your connection and try again</p>
                </div>
              </div>
            ) : activities.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-app-secondary mb-1">No activities yet</p>
                  <p className="text-sm text-app-tertiary">Start by making a deposit to see your activity history</p>
                </div>
              </div>
            ) : (
              <>
                {activities.map((activity) => (
                  <div key={activity.id} onClick={() => handleActivityClick(activity)}>
                    <ActivityRow activity={activity} />
                  </div>
                ))}

                {isFetchingMore && (
                  <div className="p-6 text-center border-t border-app-border text-app-tertiary text-sm">
                    Loading more activities...
                  </div>
                )}

                {/* Sentinel div for infinite scroll */}
                <div ref={sentinelRef} className="h-2" />
              </>
            )}
          </div>
        </div>
      </div>

      <ActivityDetailDrawer
        activity={selectedActivity}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}
