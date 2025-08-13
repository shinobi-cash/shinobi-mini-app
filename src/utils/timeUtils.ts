import { Activity } from '../types/activity'

// Utility function to convert timestamp to minutes for sorting
export const convertTimestampToMinutes = (timestamp: string): number => {
  if (timestamp.includes('hour')) {
    const hours = parseInt(timestamp.split(' ')[0])
    return hours * 60
  }
  if (timestamp.includes('day')) {
    const days = parseInt(timestamp.split(' ')[0])
    return days * 24 * 60
  }
  return 0
}

// Sort activities by time (most recent first)
export const sortActivitiesByTime = (activities: Activity[]): Activity[] => {
  return [...activities].sort((a, b) => {
    const timeA = convertTimestampToMinutes(a.timestamp)
    const timeB = convertTimestampToMinutes(b.timestamp)
    return timeA - timeB
  })
}