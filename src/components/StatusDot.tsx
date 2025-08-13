import { ActivityType, ActivityStatus } from '../types/activity'

interface StatusDotProps {
  type: ActivityType
  status: ActivityStatus
}

export const StatusDot = ({ type, status }: StatusDotProps) => {
  // Withdrawals and ragequits are always completed (green)
  if (type === 'withdrawal' || type === 'ragequit') {
    return <div className="w-3 h-3 rounded-full bg-status-success" />
  }

  // Deposits have different statuses
  if (type === 'deposit') {
    const colorMap = {
      approved: 'bg-status-success',
      pending: 'bg-status-warning',
      rejected: 'bg-status-error'
    } as const

    const color = colorMap[status as keyof typeof colorMap] || 'bg-status-neutral'
    return <div className={`w-3 h-3 rounded-full ${color}`} />
  }

  return <div className="w-3 h-3 rounded-full bg-status-neutral" />
}