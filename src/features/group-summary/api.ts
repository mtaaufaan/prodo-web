import { apiClient } from '@/lib/api'

import type { GroupSummary } from './types'

export function getGroupSummary(groupId: string) {
  return apiClient.get<GroupSummary>(`/api/v1/groups/${groupId}/summary`)
}
