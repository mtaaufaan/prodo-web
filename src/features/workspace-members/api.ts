import { apiClient } from '@/lib/api'

import type { WorkspaceMember } from './types'

export function listWorkspaceMembers(workspaceId: string) {
  return apiClient
    .get<{ workspace_members: WorkspaceMember[] }>(`/api/v1/workspaces/${workspaceId}/members`)
    .then((res) => res.workspace_members)
}

export function updateMemberRole(workspaceId: string, userId: string, role: string) {
  return apiClient.put<{ previous_role: string; role: string }>(
    `/api/v1/workspaces/${workspaceId}/members/${userId}/role`,
    { role },
  )
}
