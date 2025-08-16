import { Activity } from '../types/activity'

// Mock activity data - logically ordered chronologically  
// Note: This is only used as fallback when indexer has no data
export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: '1',
    type: 'DEPOSIT',
    poolId: '0x123',
    user: '0x1234567890123456789012345678901234567890',
    amount: '0.2',
    status: 'pending',
    timestamp: '1 hour ago',
    blockNumber: '1000000',
    transactionHash: '0xabc',
    displayAmount: '0.2 ETH',
    userShort: '0x1234...7890',
    isSponsored: false
  },
  {
    id: '2',
    type: 'WITHDRAWAL',
    poolId: '0x123',
    user: '0x1234567890123456789012345678901234567890',
    amount: '0.05',
    status: 'completed',
    timestamp: '2 hours ago',
    blockNumber: '999999',
    transactionHash: '0xdef',
    displayAmount: '0.05 ETH',
    userShort: '0x1234...7890',
    isSponsored: true
  }
]