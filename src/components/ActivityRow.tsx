import { Activity } from '../types/activity'
import { StatusDot } from './StatusDot'

interface ActivityRowProps {
  activity: Activity
}

export const ActivityRow = ({ activity }: ActivityRowProps) => (
  <div className="bg-app-surface border-b border-app px-4 py-4 active:bg-app-surface-hover">
    <div className="flex items-center justify-between">
      {/* Left side: Type and amount */}
      <div className="flex-1">
        <div className="font-medium text-app-primary tracking-tight capitalize">{activity.type}</div>
        <div className="text-sm text-app-secondary font-medium tabular-nums">{activity.amount} ETH</div>
      </div>

      {/* Right side: Timestamp and status */}
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <div className="text-sm text-app-tertiary font-medium">{activity.timestamp}</div>
        </div>
        <StatusDot type={activity.type} status={activity.status} />
      </div>
    </div>
  </div>
)