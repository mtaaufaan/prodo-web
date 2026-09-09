import { apiClient } from '@/lib/api'

import type { GroupLocale, GroupLocaleFormValues } from './types'

export function getGroupLocale(groupId: string) {
  return apiClient.get<GroupLocale>(`/api/v1/groups/${groupId}/locale`)
}

export function updateGroupLocale(groupId: string, values: GroupLocaleFormValues) {
  return apiClient.put<GroupLocale>(`/api/v1/groups/${groupId}/locale`, values)
}
