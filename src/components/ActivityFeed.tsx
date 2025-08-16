import { Activity } from '../types/activity'
import { ActivityRow } from './ActivityRow'
import { ActivityDetailDrawer } from './ActivityDetailDrawer'
import { sortActivitiesByTime } from '../utils/timeUtils'
import { calculateTotalDeposits, calculateDepositCount, formatEthAmount } from '../utils/activityUtils'
import { useState } from 'react'

interface ActivityFeedProps {
  activities: Activity[]
  loading?: boolean
  error?: string
  onLoadMore?: () => void
  hasNextPage?: boolean
}

export const ActivityFeed = ({ activities, loading, error, onLoadMore, hasNextPage }: ActivityFeedProps) => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  
  const sortedActivities = sortActivitiesByTime(activities)
  const totalDeposits = calculateTotalDeposits(activities)
  const depositCount = calculateDepositCount(activities)

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity)
    setDrawerOpen(true)
  }

  return (
    <section className="flex flex-col gap-4">
      {/* Total Deposits Section - Card */}
      <div className="px-2 pt-2 sm:px-4 sm:pt-4 flex-shrink-0">
        <div className="bg-app-surface rounded-2xl p-5 border border-app shadow-md">
          <div className="text-center">
            <h3 className="text-base font-semibold text-app-secondary mb-2">Total Deposits</h3>
            <p className="text-3xl font-bold text-app-primary tabular-nums mb-2">
              {formatEthAmount(totalDeposits)} ETH
            </p>
            <p className="text-base text-app-tertiary">
              {depositCount} deposit{depositCount !== 1 ? 's' : ''} approved
            </p>
          </div>
        </div>
      </div>

      {/* Activities Section - Title & Table */}
      <div className="flex-1 flex flex-col min-h-0 gap-2">
        <div className="sticky top-0 z-10 bg-app-surface rounded-t-xl border-b border-app shadow-md">
          <h2 className="text-lg font-semibold py-3 text-app-secondary tracking-tight text-center">
            Activities
          </h2>
        </div>
        {/* Scrollable Activities Table */}
        <div className="bg-app-surface border border-app shadow-md rounded-b-xl overflow-hidden">
          <div className="overflow-y-auto max-h-[60vh]">
            {loading ? (
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
            ) : sortedActivities.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-app-secondary mb-1">No activities yet</p>
                  <p className="text-sm text-app-tertiary">Start by making a deposit to see your activity history</p>
                </div>
              </div>
            ) : (
              <>
                {sortedActivities.map((activity, index) => (
                  <div key={activity.id} onClick={() => handleActivityClick(activity)}>
                    <ActivityRow activity={activity} />
                    {/* Remove border from last item only if no load more button */}
                    {index === sortedActivities.length - 1 && !hasNextPage && (
                      <div className="border-b-0" />
                    )}
                  </div>
                ))}
                {hasNextPage && onLoadMore && (
                  <div className="border-t border-app-border p-4 text-center">
                    <button
                      onClick={onLoadMore}
                      className="px-4 py-2 text-sm text-app-primary hover:text-app-secondary transition-colors duration-200 font-medium"
                    >
                      Load More Activities
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Activity Detail Drawer */}
      <ActivityDetailDrawer
        activity={selectedActivity}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </section>
  )
}