import { CONTRACTS } from "@/config/constants";
import type { Activity, PaginatedResponse } from "@/lib/indexer/sdk/types";
import { fetchActivities } from "@/services/data/indexerService";
import { useInfiniteQuery } from "@tanstack/react-query";

export function useActivities(poolId: string = CONTRACTS.ETH_PRIVACY_POOL, limit = 10) {
  return useInfiniteQuery<PaginatedResponse<Activity>, Error>({
    queryKey: ["activities", poolId],
    queryFn: ({ pageParam }) => fetchActivities(poolId, limit, pageParam as string | undefined, "desc"),
    getNextPageParam: (lastPage) => (lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined),
    initialPageParam: undefined, // ✅ required in React Query v5
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
