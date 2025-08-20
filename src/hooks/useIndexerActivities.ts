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
  const { limit = 15, after } = options

  const { loading, error, data, fetchMore } = useQuery<ActivitiesResponse>(GET_ACTIVITIES, {
    variables: { limit, after },
    pollInterval: 30000, // Poll every 30 seconds for new activities
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  })

  // Use activities directly from indexer (no conversion needed)
  const activities: Activity[] = data?.activitys?.items || []
  const pageInfo = data?.activitys?.pageInfo

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

  return {
    activities,
    loading,
    error,
    isEmpty: !loading && !error && activities.length === 0,
    pageInfo,
    loadMore,
    hasNextPage: pageInfo?.hasNextPage || false,
  }
}