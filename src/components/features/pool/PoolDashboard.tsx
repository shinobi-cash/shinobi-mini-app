/**
 * Pool Dashboard - Main landing page
 * Displays pool statistics, asset selection, actions, and recent activity
 * Serves as the primary interface for pool interactions
 */

import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import type { Activity } from "@/lib/indexer/sdk";
import { fetchPoolStats } from "@/services/data/indexerService";
import { useBanner } from "@/contexts/BannerContext";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../ui/button";
import { ActivityDetailDrawer } from "../profile/ActivityDetailDrawer";
import { ActivityRow } from "../profile/ActivityRow";
import { PoolStatsCard } from "./PoolStatsCard";
import { AssetSelector } from "./AssetSelector";
import { PoolActions } from "./PoolActions";

interface PoolDashboardProps {
  activities: Activity[];
  loading?: boolean;
  error?: string;
  hasNextPage?: boolean;
  onFetchMore?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
}

// Current supported asset - designed for future expansion
const ETH_ASSET = {
  symbol: "ETH",
  name: "Ethereum",
  icon: "/ethereum.svg"
};

export function PoolDashboard({
  activities,
  loading,
  error,
  onFetchMore,
  hasNextPage,
  onRefresh,
}: PoolDashboardProps) {
  const { banner } = useBanner();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAsset] = useState(ETH_ASSET); // Future: make this dynamic
  
  // Pool stats state
  const [poolStats, setPoolStats] = useState<{
    totalDeposits: string;
    totalWithdrawals: string;
    memberCount: number;
    createdAt: string;
  } | null>(null);
  const [poolStatsLoading, setPoolStatsLoading] = useState(true);
  const [poolStatsError, setPoolStatsError] = useState<Error | null>(null);
  
  // Refs
  const lastPoolStatsErrorRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { onTransactionIndexed } = useTransactionTracking();

  // Load pool stats
  const loadPoolStats = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setPoolStatsLoading(true);
      setPoolStatsError(null);

      try {
        const stats = await fetchPoolStats();
        setPoolStats(stats);
      } catch (error) {
        setPoolStatsError(error as Error);
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

  // Show banner error when pool stats refresh fails
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
      loadPoolStats(true);
    });
    return cleanup;
  }, [onTransactionIndexed, onRefresh, loadPoolStats]);

  // Handle activity click
  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setDrawerOpen(true);
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([onRefresh?.(), loadPoolStats(true)]).finally(() => setIsRefreshing(false));
  };

  // Infinite scroll setup
  useEffect(() => {
    if (!onFetchMore || !hasNextPage || !sentinelRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingMore && hasNextPage) {
          setIsFetchingMore(true);
          onFetchMore().finally(() => setIsFetchingMore(false));
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "100px", // Trigger 100px before reaching the sentinel
        threshold: 0.1,
      }
    );
    
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onFetchMore, hasNextPage, isFetchingMore]);

  const totalDeposits = poolStats?.totalDeposits ? BigInt(poolStats.totalDeposits) : 0n;
  const memberCount = poolStats?.memberCount || 0;

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Pool Overview */}
      <div className="space-y-4">
        <PoolStatsCard
          totalDeposits={totalDeposits}
          memberCount={memberCount}
          loading={poolStatsLoading}
        />
        
        <AssetSelector
          selectedAsset={selectedAsset}
          disabled={true} // Future: enable when multi-asset support is added
        />
        
        <PoolActions />
      </div>

      {/* Recent Activity */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 bg-app-surface border border-app rounded-t-xl">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-semibold text-app-secondary">Recent Activity</h3>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="h-8 w-8 p-0 text-app-secondary hover:text-app-primary"
                title="Refresh activity"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-app-surface border-x border-b border-app rounded-b-xl overflow-hidden">
          <div ref={scrollContainerRef} className="h-full overflow-y-auto">
            {loading && activities.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-app-secondary">Loading activity...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-app-secondary mb-1">{error}</p>
                  <p className="text-sm text-app-tertiary">Check your connection and try again</p>
                </div>
              </div>
            ) : activities.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-app-secondary mb-1">No activity yet</p>
                  <p className="text-sm text-app-tertiary">Make your first deposit to get started</p>
                </div>
              </div>
            ) : (
              <>
                {activities.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => handleActivityClick(activity)}
                    className="w-full text-left border-b border-app-border last:border-b-0 hover:bg-app-surface-hover transition-colors duration-200"
                  >
                    <ActivityRow activity={activity} />
                  </button>
                ))}

                {isFetchingMore && (
                  <div className="p-6 text-center text-app-tertiary text-sm">
                    Loading more activities...
                  </div>
                )}

                {/* Sentinel for infinite scroll */}
                {hasNextPage && (
                  <div ref={sentinelRef} className="h-4 w-full" />
                )}
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
  );
}