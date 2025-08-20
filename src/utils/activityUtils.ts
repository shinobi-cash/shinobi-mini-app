
import type { Activity } from '../types/activity'
import { formatEthAmount } from './formatters'

// Calculate total deposit value from approved deposits
export const calculateTotalDeposits = (activities: Activity[]): number => {
  return activities
    .filter(activity => activity.type === 'DEPOSIT' && activity.aspStatus === 'approved')
    .reduce((total, activity) => total + parseFloat(formatEthAmount(activity.amount)), 0)
}

// Calculate count of approved deposits
export const calculateDepositCount = (activities: Activity[]): number => {
  return activities
    .filter(activity => activity.type === 'DEPOSIT' && activity.aspStatus === 'approved')
    .length
}

// Note: formatEthAmount and timestamp formatting functions are now imported from ./formatters