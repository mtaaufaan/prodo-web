import { apiClient } from '@/lib/api'

import type { GroupAccount, ProjectMember } from './types'

export function listProjectMembers(projectId: string) {
  return apiClient.get<ProjectMember[]>(`/api/v1/projects/${projectId}/members`)
}

export function addProjectMember(projectId: string, userId: string, role: string) {
  return apiClient.post<{ user_id: string; role: string }>(`/api/v1/projects/${projectId}/members`, {
    user_id: userId,
    role,
  })
}

export function updateProjectMemberRole(projectId: string, userId: string, role: string) {
  return apiClient.put<{ user_id: string; role: string }>(`/api/v1/projects/${projectId}/members/${userId}/role`, {
    role,
  })
}

export function removeProjectMember(projectId: string, userId: string) {
  return apiClient.delete<void>(`/api/v1/projects/${projectId}/members/${userId}`)
}

// S3-20 -- dipakai autocomplete pencarian member (S3-24 AC).
export function searchGroupAccounts(groupId: string, query: string) {
  return apiClient.get<GroupAccount[]>(`/api/v1/groups/${groupId}/accounts/search`, { params: { q: query } })
}
