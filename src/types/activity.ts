export type ActivityType = 'DEPOSIT' | 'WITHDRAWAL' | 'RAGEQUIT'
export type ActivityStatus = 'pending' | 'approved' | 'rejected'

// Simplified Activity interface (matches indexer data structure)
export interface Activity {
  id: string
  type: ActivityType
  aspStatus: ActivityStatus
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

