import { Activity } from '../types/activity'
import { ActivityRow } from './ActivityRow'
import { sortActivitiesByTime } from '../utils/timeUtils'
import { calculateTotalDeposits, calculateDepositCount, formatEthAmount } from '../utils/activityUtils'

interface ActivityFeedProps {
  activities: Activity[]
}

export const ActivityFeed = ({ activities }: ActivityFeedProps) => {
  const sortedActivities = sortActivitiesByTime(activities)
  const totalDeposits = calculateTotalDeposits(activities)
  const depositCount = calculateDepositCount(activities)

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
            {sortedActivities.map((activity, index) => (
              <div key={activity.id}>
                <ActivityRow activity={activity} />
                {/* Remove border from last item */}
                {index === sortedActivities.length - 1 && (
                  <div className="border-b-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}