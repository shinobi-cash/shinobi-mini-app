import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import type { Activity } from "@/lib/indexer/sdk";
import { fetchPoolStats } from "@/services/data/indexerService";
import { formatEthAmount } from "@/utils/formatters";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../ui/button";
import { ActivityDetailDrawer } from "./ActivityDetailDrawer";
import { ActivityRow } from "./ActivityRow";
import { useBanner } from "@/contexts/BannerContext";

export interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
  error?: string;
  hasNextPage?: boolean;
  onFetchMore?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export const ActivityFeed = ({
  activities,
  loading,
  error,
  onFetchMore,
  hasNextPage,
  onRefresh,
}: ActivityFeedProps) => {
  const { banner } = useBanner();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [poolStats, setPoolStats] = useState<{
    totalDeposits: string;
    totalWithdrawals: string;
    memberCount: number;
    createdAt: string;
  } | null>(null);
  const [poolStatsLoading, setPoolStatsLoading] = useState(true);
  const [poolStatsError, setPoolStatsError] = useState<Error | null>(null);
  const lastPoolStatsErrorRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { onTransactionIndexed } = useTransactionTracking();

  // Fetch pool stats using the service
  const loadPoolStats = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setPoolStatsLoading(true);
      setPoolStatsError(null);

      try {
        const stats = await fetchPoolStats();
        setPoolStats(stats);
      } catch (error) {
        setPoolStatsError(error as Error);

        // If this is initial load (not refresh), clear data
        if (!isRefresh && !poolStats) {
          setPoolStats(null);
        }
      } finally {
        setPoolStatsLoading(false);
      }
    },
    [poolStats],
  );

  // Load pool stats on mount
  useEffect(() => {
    loadPoolStats();
  }, [loadPoolStats]);

  // Show banner error when pool stats refresh fails (prevent infinite loops)
  useEffect(() => {
    const errorMessage = poolStatsError?.message || null;

    if (errorMessage && poolStats && errorMessage !== lastPoolStatsErrorRef.current) {
      banner.error("Failed to refresh pool stats", { duration: 5000 });
      lastPoolStatsErrorRef.current = errorMessage;
    } else if (!errorMessage) {
      lastPoolStatsErrorRef.current = null;
    }
  }, [poolStatsError?.message, poolStats, banner]);

  // Auto-refresh when transaction gets indexed
  useEffect(() => {
    const cleanup = onTransactionIndexed(() => {
      onRefresh?.();
      loadPoolStats(true); // Pass true for refresh
    });
    return cleanup;
  }, [onTransactionIndexed, onRefresh, loadPoolStats]);

  // Use accurate total from indexer pool stats
  const totalDeposits = poolStats?.totalDeposits ? BigInt(poolStats.totalDeposits) : 0n;
  const memberCount = poolStats?.memberCount || 0;

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setDrawerOpen(true);
  };

  // Infinite scroll
  useEffect(() => {
    if (!onFetchMore || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingMore) {
        setIsFetchingMore(true);
        onFetchMore().finally(() => setIsFetchingMore(false));
      }
    });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onFetchMore, hasNextPage, isFetchingMore]);

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Total Deposits */}
      <div className="flex-shrink-0">
        <div className="flex justify-between bg-app-surface p-3 border-t border-b border-app shadow-md">
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-app-secondary mb-1">Deposits</p>
            <p className="text-xl font-bold text-app-primary tabular-nums">
              {poolStatsLoading ? "..." : `${formatEthAmount(totalDeposits, { decimals: 4 })} ETH`}
            </p>
          </div>
          <div className="flex flex-col text-right">
            <p className="text-sm font-semibold text-app-secondary mb-1">Count</p>
            <p className="text-xl font-bold text-app-primary tabular-nums">
              {poolStatsLoading ? "..." : `${memberCount}`}
            </p>
          </div>
        </div>
      </div>

      {/* Activities */}
      <div className="flex-1 flex flex-col min-h-0 gap-2">
        <div className="flex-shrink-0 bg-app-surface border-b border-app shadow-md">
          <div className="flex items-center justify-between py-3 px-4">
            <h2 className="text-lg font-semibold text-app-secondary tracking-tight flex-1">Activities</h2>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsRefreshing(true);
                  Promise.all([onRefresh(), loadPoolStats(true)]).finally(() => setIsRefreshing(false));
                }}
                disabled={isRefreshing || loading}
                className="h-8 w-8 p-0 text-app-secondary hover:text-app-primary"
                title="Refresh activities and pool stats"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-app-surface border-b border-app shadow-md overflow-hidden">
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
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
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => handleActivityClick(activity)}
                    className="w-full text-left"
                  >
                    <ActivityRow activity={activity} />
                  </button>
                ))}

                {isFetchingMore && (
                  <div className="p-6 text-center border-t border-app-border text-app-tertiary text-sm">
                    Loading more activities...
                  </div>
                )}

                {/* Sentinel div for infinite scroll */}
                <div ref={sentinelRef} />
              </>
            )}
          </div>
        </div>
      </div>

      <ActivityDetailDrawer activity={selectedActivity} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
};
