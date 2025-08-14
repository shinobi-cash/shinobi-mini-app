import { Activity } from '../types/activity'
import { StatusDot } from './StatusDot'

interface ActivityRowProps {
  activity: Activity
}

export const ActivityRow = ({ activity }: ActivityRowProps) => (
  <div className="bg-app-surface border-b border-app px-3 py-3 sm:px-4 sm:py-4 active:bg-app-surface-hover rounded-xl transition-all duration-150">
    <div className="flex items-center justify-between gap-2">
      {/* Left side: Type and amount */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-app-primary tracking-tight capitalize text-base sm:text-lg truncate">{activity.type}</div>
        <div className="text-sm sm:text-base text-app-secondary font-medium tabular-nums">{activity.amount} ETH</div>
      </div>

      {/* Right side: Timestamp and status */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="text-right">
          <div className="text-xs sm:text-sm text-app-tertiary font-medium whitespace-nowrap">{activity.timestamp}</div>
        </div>
        <StatusDot type={activity.type} status={activity.status} />
      </div>
    </div>
  </div>
)