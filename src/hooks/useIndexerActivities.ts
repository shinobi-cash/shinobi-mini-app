import { useQuery } from '@apollo/client'
import { GET_ACTIVITIES } from '../config/queries'
import { Activity } from '../types/activity'

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
    variables: { limit, after },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  })

  // Activities directly from indexer
  const activities: Activity[] = data?.activitys?.items || []
  const pageInfo = data?.activitys?.pageInfo

  /** Load next page */
  const loadMore = () => {
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
  }

  /** Pull-to-refresh: reset to first page */
  const refresh = () => {
    return refetch({
      limit,
      after: undefined, // start from beginning
    })
  }

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
