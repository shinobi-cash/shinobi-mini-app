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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Total Deposits Section - Fixed */}
      <div className="px-4 py-4 flex-shrink-0">
        <div className="bg-app-surface rounded-xl p-4 border border-app shadow-sm">
          <div className="text-center">
            <h3 className="text-sm font-medium text-app-secondary mb-1">Total Deposits</h3>
            <p className="text-2xl font-semibold text-app-primary tabular-nums mb-1">
              {formatEthAmount(totalDeposits)} ETH
            </p>
            <p className="text-sm text-app-tertiary">
              {depositCount} deposit{depositCount !== 1 ? 's' : ''} approved
            </p>
          </div>
        </div>
      </div>

      {/* Activities Section - Title Fixed, Table Scrollable */}
      <div className="pb-20 flex-1 flex flex-col min-h-0 overflow-hidden">
        <h2 className="text-xl font-semibold mb-4 text-app-secondary tracking-tight flex-shrink-0 text-center">
          Activities
        </h2>
        
        {/* Scrollable Activities Table */}
        <div className="bg-app-surface border border-app shadow-sm flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
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
    </div>
  )
}