
import { Activity } from '../types/activity'

// Calculate total deposit value from approved deposits
export const calculateTotalDeposits = (activities: Activity[]): number => {
  return activities
    .filter(activity => activity.type === 'DEPOSIT' && activity.status === 'approved')
    .reduce((total, activity) => total + parseFloat(activity.amount), 0)
}

// Calculate count of approved deposits
export const calculateDepositCount = (activities: Activity[]): number => {
  return activities
    .filter(activity => activity.type === 'DEPOSIT' && activity.status === 'approved')
    .length
}

// Format ETH amount for display
export const formatEthAmount = (amount: number): string => {
  return amount.toFixed(3)
}