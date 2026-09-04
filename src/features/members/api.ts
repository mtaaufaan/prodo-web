import { apiClient } from '@/lib/api'

import type { GroupMemberDirectory } from './types'

export function listGroupMembers(groupId: string) {
  return apiClient.get<GroupMemberDirectory>(`/api/v1/groups/${groupId}/members`)
}

export function toggleExecutive(groupId: string, userId: string, assign: boolean) {
  return apiClient.put<{ user_id: string; is_executive: boolean }>(
    `/api/v1/groups/${groupId}/members/${userId}/executive`,
    { assign },
  )
}

export function updateMemberIdentity(groupId: string, userId: string, displayName: string, title: string) {
  return apiClient.put<{ user_id: string; display_name: string; title: string }>(
    `/api/v1/groups/${groupId}/members/${userId}/identity`,
    { display_name: displayName, title },
  )
}

export function deactivateMemberAccess(groupId: string, userId: string) {
  return apiClient.put<{ user_id: string; active: boolean }>(`/api/v1/groups/${groupId}/members/${userId}/deactivate`)
}

export function reactivateMemberAccess(groupId: string, userId: string) {
  return apiClient.put<{ user_id: string; active: boolean }>(`/api/v1/groups/${groupId}/members/${userId}/reactivate`)
}

export function inviteExecutive(groupId: string, email: string) {
  return apiClient.post<{ id: string; email: string; expires_at: string }>(
    `/api/v1/groups/${groupId}/executive-invitations`,
    { email },
  )
}
