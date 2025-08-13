// Activity types and interfaces
export type ActivityType = 'deposit' | 'withdrawal' | 'ragequit'
export type ActivityStatus = 'pending' | 'approved' | 'rejected' | 'completed'

export interface Activity {
  id: string
  type: ActivityType
  amount: string
  status: ActivityStatus
  timestamp: string
}