import { ActivityStatus, ActivityType } from "@/services/data/queryService"

interface StatusDotProps {
  type: ActivityType
  status: ActivityStatus
}

export const StatusDot = ({ type, status }: StatusDotProps) => {
  // Withdrawals and ragequits are always auto-approved (green)
  if (type === 'WITHDRAWAL' || type === 'RAGEQUIT') {
    return <div className="w-3 h-3 rounded-full bg-status-success" />
  }

  // Deposits have different statuses
  if (type === 'DEPOSIT') {
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