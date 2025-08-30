import { useCallback, useEffect, useState } from "react";
import { fetchActivities } from "@/services/data/queryService";
import type { Activity } from "@/services/data/queryService";
import { CONTRACTS } from "@/config/constants";

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

interface UseIndexerActivitiesOptions {
  limit?: number;
  after?: string;
}

export function useIndexerActivities(options: UseIndexerActivitiesOptions = {}) {
  const { limit = 10, after } = options;
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const fetchData = useCallback(
    async (after?: string, append = false) => {
      try {
        if (!append) setLoading(true);
        setError(null);

        const result = await fetchActivities(CONTRACTS.ETH_PRIVACY_POOL, limit, after);

        if (append) {
          setActivities((prev) => [...prev, ...result.items]);
        } else {
          setActivities(result.items);
        }

        setPageInfo(result.pageInfo);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    fetchData(after);
  }, [fetchData, after]);

  /** Load next page */
  const loadMore = useCallback(() => {
    if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
      return fetchData(pageInfo.endCursor, true);
    }
  }, [pageInfo?.hasNextPage, pageInfo?.endCursor, fetchData]);

  /** Pull-to-refresh: reset to first page */
  const refresh = useCallback(() => {
    return fetchData(undefined, false);
  }, [fetchData]);

  return {
    activities,
    loading,
    error,
    isEmpty: !loading && !error && activities.length === 0,
    pageInfo,
    loadMore,
    refresh,
    hasNextPage: pageInfo?.hasNextPage || false,
    networkStatus: loading ? 1 : 7, // Compatible with Apollo's networkStatus
  };
}
