import { apiClient } from '@/lib/api'

import type { Project } from './types'

export function listProjects(workspaceId: string) {
  return apiClient.get<Project[]>(`/api/v1/workspaces/${workspaceId}/projects`)
}

export function createProject(workspaceId: string, input: { name: string; code: string; pm_user_id: string }) {
  return apiClient.post<Project>(`/api/v1/workspaces/${workspaceId}/projects`, input)
}

export function updateProject(projectId: string, input: { name: string; pm_user_id?: string }) {
  return apiClient.put<{ id: string; name: string }>(`/api/v1/projects/${projectId}`, input)
}

export function setProjectArchived(projectId: string, archive: boolean) {
  const action = archive ? 'archive' : 'unarchive'
  return apiClient.put<{ id: string; is_archived: boolean }>(`/api/v1/projects/${projectId}/${action}`)
}

export function deleteProject(projectId: string) {
  return apiClient.delete<void>(`/api/v1/projects/${projectId}`)
}
