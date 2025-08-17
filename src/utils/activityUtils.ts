
import { formatDistance } from 'date-fns'
import type { Activity } from '../types/activity'
import { formatEther } from 'viem'

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

export function formatTimestamp(timestamp: string): string {
  return formatDistance(new Date(parseInt(timestamp)*1000), new Date(), { addSuffix: true })
}

// Helper function to format bigint wei amount to ETH
export function formatEthAmount(weiAmount: string): string {
  try {
    const wei = BigInt(weiAmount)
    const ethString = formatEther(wei)
    // Remove trailing zeros and decimal point if not needed, but avoid scientific notation
    return ethString.replace(/\.?0+$/, '') || '0'
  } catch {
    return '0'
  }
}