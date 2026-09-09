import { apiClient } from '@/lib/api'

import type { GroupPerformanceResult } from './types'

// getGroupPerformance -- rangeDays 0 = SEMUA (chip "SEMUA" di desain),
// orgId kosong = seluruh organisasi aktif grup ini.
export function getGroupPerformance(groupId: string, orgId: string, rangeDays: number) {
  return apiClient.get<GroupPerformanceResult>(`/api/v1/groups/${groupId}/performance`, {
    params: { org_id: orgId || undefined, range: rangeDays },
  })
}
