import { Activity } from '../types/activity'

// Mock activity data - logically ordered chronologically
export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: '1',
    type: 'deposit',
    amount: '0.2',
    status: 'pending',
    timestamp: '1 hour ago'
  },
  {
    id: '2',
    type: 'withdrawal',
    amount: '0.05',
    status: 'completed',
    timestamp: '2 hours ago'
  },
  {
    id: '3',
    type: 'deposit',
    amount: '0.15',
    status: 'approved',
    timestamp: '5 hours ago'
  },
  {
    id: '4',
    type: 'withdrawal',
    amount: '0.03',
    status: 'completed',
    timestamp: '8 hours ago'
  },
  {
    id: '5',
    type: 'deposit',
    amount: '0.5',
    status: 'approved',
    timestamp: '12 hours ago'
  },
  {
    id: '6',
    type: 'withdrawal',
    amount: '0.1',
    status: 'completed',
    timestamp: '1 day ago'
  },
  {
    id: '7',
    type: 'deposit',
    amount: '0.1',
    status: 'approved',
    timestamp: '2 days ago'
  },
  {
    id: '8',
    type: 'deposit',
    amount: '0.25',
    status: 'approved',
    timestamp: '2 days ago'
  },
  {
    id: '9',
    type: 'withdrawal',
    amount: '0.02',
    status: 'completed',
    timestamp: '3 days ago'
  },
  {
    id: '10',
    type: 'ragequit',
    amount: '0.08',
    status: 'completed',
    timestamp: '3 days ago'
  },
  {
    id: '11',
    type: 'deposit',
    amount: '0.08',
    status: 'rejected',
    timestamp: '4 days ago'
  },
  {
    id: '12',
    type: 'deposit',
    amount: '0.3',
    status: 'approved',
    timestamp: '5 days ago'
  },
  {
    id: '13',
    type: 'withdrawal',
    amount: '0.07',
    status: 'completed',
    timestamp: '5 days ago'
  },
  {
    id: '14',
    type: 'deposit',
    amount: '0.4',
    status: 'approved',
    timestamp: '6 days ago'
  },
  {
    id: '15',
    type: 'deposit',
    amount: '0.12',
    status: 'approved',
    timestamp: '1 week ago'
  },
  {
    id: '16',
    type: 'withdrawal',
    amount: '0.06',
    status: 'completed',
    timestamp: '1 week ago'
  },
  {
    id: '17',
    type: 'deposit',
    amount: '0.18',
    status: 'approved',
    timestamp: '1 week ago'
  },
  {
    id: '18',
    type: 'deposit',
    amount: '0.22',
    status: 'approved',
    timestamp: '2 weeks ago'
  }
]