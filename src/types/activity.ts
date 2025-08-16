// Activity types and interfaces
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
  feeAmount?: string
  relayer?: string
  isSponsored: boolean
  status: ActivityStatus
  timestamp: string // formatted relative time
  blockNumber: string
  transactionHash: string
  // Additional computed fields
  displayAmount: string // formatted ETH amount
  userShort: string // shortened address
}

// Function to convert indexer activity to UI activity
export function convertIndexerToUIActivity(indexerActivity: IndexerActivity): Activity {
  // Convert bigint amount to ETH (assuming 18 decimals)
  const amountInEth = formatEthAmount(indexerActivity.amount)
  const feeInEth = indexerActivity.feeAmount ? formatEthAmount(indexerActivity.feeAmount) : undefined
  
  return {
    id: indexerActivity.id,
    type: indexerActivity.type,
    poolId: indexerActivity.poolId,
    user: indexerActivity.user,
    recipient: indexerActivity.recipient || undefined,
    amount: amountInEth,
    feeAmount: feeInEth,
    relayer: indexerActivity.relayer || undefined,
    isSponsored: indexerActivity.isSponsored,
    status: 'completed', // All indexed activities are completed
    timestamp: formatTimestamp(indexerActivity.timestamp),
    blockNumber: indexerActivity.blockNumber,
    transactionHash: indexerActivity.transactionHash,
    displayAmount: `${amountInEth} ETH`,
    userShort: shortenAddress(indexerActivity.user),
  }
}

// Helper function to format bigint wei amount to ETH
function formatEthAmount(weiAmount: string): string {
  try {
    const wei = BigInt(weiAmount)
    const eth = Number(wei) / 1e18
    return eth.toFixed(6).replace(/\.?0+$/, '') // Remove trailing zeros
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