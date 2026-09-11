import { useQuery } from '@tanstack/react-query'

import { getGroupPerformance } from './api'

export const groupPerformanceKeys = {
  all: ['group-performance'] as const,
  summary: (groupId: string, orgId: string, rangeDays: number) => [...groupPerformanceKeys.all, 'summary', groupId, orgId, rangeDays] as const,
}

// staleTime: 0 (override default global 60 detik di query-client.ts) --
// sama alasan useGroupAuditLogs: agregat task/project lintas grup ini
// dimutasi dari puluhan fitur task/project lain yang tidak pernah
// meng-invalidate query ini.
export function useGroupPerformance(groupId: string, orgId: string, rangeDays: number) {
  return useQuery({
    queryKey: groupPerformanceKeys.summary(groupId, orgId, rangeDays),
    queryFn: () => getGroupPerformance(groupId, orgId, rangeDays),
    enabled: groupId !== '',
    staleTime: 0,
  })
}
