import { apiClient } from '@/lib/api'

import type { RetentionScheduleItem } from './types'

export function getRetentionSchedule(groupId: string) {
  return apiClient.get<RetentionScheduleItem[]>(`/api/v1/groups/${groupId}/retention-schedule`)
}

export function bulkUpdateRetentionPolicy(groupId: string, retentions: Record<string, number>) {
  return apiClient.put<{ group_id: string; retentions: Record<string, number> }>(`/api/v1/groups/${groupId}/retention-policy`, {
    retentions,
  })
}

export function requestRetentionExport(groupId: string, kind: string, itemId: string) {
  return apiClient.post<{ sent: boolean }>(`/api/v1/groups/${groupId}/retention-exports`, { kind, item_id: itemId })
}
