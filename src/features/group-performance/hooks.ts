import { useQuery } from '@tanstack/react-query'

import { getGroupPerformance } from './api'

export const groupPerformanceKeys = {
  all: ['group-performance'] as const,
  summary: (groupId: string, orgId: string, rangeDays: number) => [...groupPerformanceKeys.all, 'summary', groupId, orgId, rangeDays] as const,
}

export function useGroupPerformance(groupId: string, orgId: string, rangeDays: number) {
  return useQuery({
    queryKey: groupPerformanceKeys.summary(groupId, orgId, rangeDays),
    queryFn: () => getGroupPerformance(groupId, orgId, rangeDays),
    enabled: groupId !== '',
  })
}
