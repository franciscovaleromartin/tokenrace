import { useState } from 'react'
import type { TimeRange } from '../types'

export function useTimeRange() {
  const [timeRange, setTimeRange] = useState<TimeRange>('now-7d')
  return { timeRange, setTimeRange }
}
