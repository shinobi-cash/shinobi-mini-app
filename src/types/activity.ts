// Activity types and interfaces
import { formatEther } from 'viem'

export type ActivityType = 'DEPOSIT' | 'WITHDRAWAL' | 'RAGEQUIT'
export type ActivityStatus = 'pending' | 'approved' | 'rejected' | 'completed'

// Indexer activity data structure (matches Ponder schema)
export interface IndexerActivity {
  id: string
  type: ActivityType
  poolId: string
  user: string
  recipient?: string | null
  amount: string // bigint as string from GraphQL
  originalAmount?: string | null // bigint as string (deposits only)
  vettingFeeAmount?: string | null // bigint as string (deposits only)
  commitment: string // bigint as string
  label?: string | null // bigint as string
  precommitmentHash?: string | null // bigint as string
  spentNullifier?: string | null // bigint as string
  newCommitment?: string | null // bigint as string
  feeAmount?: string | null // bigint as string
  relayer?: string | null
  isSponsored: boolean
  blockNumber: string // bigint as string
  timestamp: string // bigint as string
  transactionHash: string
}

// UI activity data structure (for display)
export interface Activity {
  id: string
  type: ActivityType
  poolId: string
  user: string
  recipient?: string
  amount: string // formatted for display
  originalAmount?: string // for deposits - before vetting fee
  vettingFeeAmount?: string // for deposits - vetting fee
  feeAmount?: string
  relayer?: string
  isSponsored: boolean
  status: ActivityStatus
  timestamp: string // formatted relative time
  blockNumber: string
  transactionHash: string
  // ZK proof fields
  commitment?: string
  label?: string
  precommitmentHash?: string
  spentNullifier?: string
  newCommitment?: string
  // Additional computed fields
  displayAmount: string // formatted ETH amount
  userShort: string // shortened address
}

// Function to convert indexer activity to UI activity
export function convertIndexerToUIActivity(indexerActivity: IndexerActivity): Activity {
  // Convert bigint amount to ETH (assuming 18 decimals)
  const amountInEth = formatEthAmount(indexerActivity.amount)
  const feeInEth = indexerActivity.feeAmount ? formatEthAmount(indexerActivity.feeAmount) : undefined
  const originalAmountInEth = indexerActivity.originalAmount ? formatEthAmount(indexerActivity.originalAmount) : undefined
  const vettingFeeInEth = indexerActivity.vettingFeeAmount ? formatEthAmount(indexerActivity.vettingFeeAmount) : undefined
  
  // Determine status based on activity type  
  const status = indexerActivity.type === 'DEPOSIT' ? 'pending' : 'completed'

  return {
    id: indexerActivity.id,
    type: indexerActivity.type,
    poolId: indexerActivity.poolId,
    user: indexerActivity.user,
    recipient: indexerActivity.recipient || undefined,
    amount: amountInEth,
    originalAmount: originalAmountInEth,
    vettingFeeAmount: vettingFeeInEth,
    feeAmount: feeInEth,
    relayer: indexerActivity.relayer || undefined,
    isSponsored: indexerActivity.isSponsored,
    status,
    timestamp: formatTimestamp(indexerActivity.timestamp),
    blockNumber: indexerActivity.blockNumber,
    transactionHash: indexerActivity.transactionHash,
    // ZK proof fields
    commitment: indexerActivity.commitment || undefined,
    label: indexerActivity.label || undefined,
    precommitmentHash: indexerActivity.precommitmentHash || undefined,
    spentNullifier: indexerActivity.spentNullifier || undefined,
    newCommitment: indexerActivity.newCommitment || undefined,
    // Additional computed fields
    displayAmount: `${amountInEth} ETH`,
    userShort: shortenAddress(indexerActivity.user),
  }
}


// Helper function to format bigint wei amount to ETH
function formatEthAmount(weiAmount: string): string {
  try {
    const wei = BigInt(weiAmount)
    const ethString = formatEther(wei)
    // Remove trailing zeros and decimal point if not needed, but avoid scientific notation
    return ethString.replace(/\.?0+$/, '') || '0'
  } catch {
    return '0'
  }
}

// Helper function to shorten ethereum addresses
function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Helper function to format timestamp from indexer
function formatTimestamp(timestamp: string): string {
  const date = new Date(parseInt(timestamp) * 1000) // Convert Unix timestamp
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  } else if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
  } else {
    const diffWeeks = Math.floor(diffDays / 7)
    return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`
  }
}