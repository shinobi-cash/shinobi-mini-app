import { useQuery } from '@apollo/client'
import { useCallback } from 'react'
import { GET_ACTIVITIES } from '../../config/queries'
import type { Activity } from '@/services/data'
import { CONTRACTS } from '@/config/constants'

interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor?: string
  endCursor?: string
}

interface ActivitiesResponse {
  activitys: {
    items: Activity[]
    pageInfo: PageInfo
  }
}

interface UseIndexerActivitiesOptions {
  limit?: number
  after?: string
}

export function useIndexerActivities(options: UseIndexerActivitiesOptions = {}) {
  const { limit = 10, after } = options

  const {
    loading,
    error,
    data,
    fetchMore,
    refetch,
    networkStatus,
  } = useQuery<ActivitiesResponse>(GET_ACTIVITIES, {
    variables: { 
      poolId: CONTRACTS.ETH_PRIVACY_POOL.toLowerCase(),
      limit, 
      after 
    },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  })

  // Activities directly from indexer
  const activities: Activity[] = data?.activitys?.items || []
  const pageInfo = data?.activitys?.pageInfo

  /** Load next page */
  const loadMore = useCallback(() => {
    if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
      return fetchMore({
        variables: {
          after: pageInfo.endCursor,
          limit,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev

          return {
            activitys: {
              ...fetchMoreResult.activitys,
              items: [...prev.activitys.items, ...fetchMoreResult.activitys.items],
              pageInfo: fetchMoreResult.activitys.pageInfo,
            },
          }
        },
      })
    }
  }, [pageInfo?.hasNextPage, pageInfo?.endCursor, fetchMore, limit])

  /** Pull-to-refresh: reset to first page */
  const refresh = useCallback(() => {
    return refetch({
      poolId: CONTRACTS.ETH_PRIVACY_POOL.toLowerCase(),
      limit,
      after: undefined, // start from beginning
    })
  }, [refetch, limit])

  return {
    activities,
    loading,
    error,
    isEmpty: !loading && !error && activities.length === 0,
    pageInfo,
    loadMore,
    refresh,
    hasNextPage: pageInfo?.hasNextPage || false,
    networkStatus,
  }
}
