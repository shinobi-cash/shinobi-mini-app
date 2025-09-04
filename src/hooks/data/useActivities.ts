/**
 * Hook for activity data using indexer service
 * Uses consistent SDK-based service layer
 */

import type { Activity, PaginatedResponse } from "@/lib/indexer/sdk/types";
import { fetchActivities } from "@/services/data/indexerService";
import { useCallback, useEffect, useState } from "react";

interface UseActivitiesOptions {
  poolId: string;
  limit?: number;
  orderDirection?: "asc" | "desc";
}

interface UseActivitiesResult {
  activities: Activity[] | null;
  loading: boolean;
  error: Error | null;
  fetchMore: () => Promise<void>;
  refetch: () => Promise<void>;
  hasNextPage: boolean;
  hasData: boolean; // New: indicates if we have any data (successful or cached)
}

export function useActivities({
  poolId,
  limit = 10,
  orderDirection = "desc",
}: UseActivitiesOptions): UseActivitiesResult {
  const [data, setData] = useState<PaginatedResponse<Activity> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActivitiesData = useCallback(
    async (isLoadMore = false, isRefresh = false) => {
      try {
        setLoading(!isRefresh); // Don't show loading spinner for refresh
        setError(null);

        // Get current data for pagination
        const currentData = isLoadMore ? data : null;

        const result = await fetchActivities(
          poolId.toLowerCase(), // Convert to lowercase for GraphQL query
          limit,
          currentData?.pageInfo?.endCursor,
          orderDirection,
        );

        if (isLoadMore && currentData) {
          setData({
            ...result,
            items: [...currentData.items, ...result.items],
          });
        } else {
          setData(result);
        }
      } catch (err: unknown) {
        // Normalize unknown to Error before updating state
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error(String(err)));
        }

        // If this is a refresh and we have existing data, don't clear it
        if (!isRefresh && !isLoadMore) {
          setData(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [poolId, limit, orderDirection, data],
  );

  const refetch = useCallback(() => {
    // Don't clear existing data on refresh - preserve for better UX
    return fetchActivitiesData(false, true);
  }, [fetchActivitiesData]);

  const fetchMore = useCallback(() => {
    return fetchActivitiesData(true);
  }, [fetchActivitiesData]);

  useEffect(() => {
    fetchActivitiesData(false);
  }, [fetchActivitiesData]);

  return {
    activities: data?.items || null,
    loading,
    error,
    fetchMore,
    refetch,
    hasNextPage: data?.pageInfo.hasNextPage || false,
    hasData: (data?.items?.length ?? 0) > 0,
  };
}
