import { apiClient } from '@/lib/api'

import type { PMTarget, Project } from './types'

export function listProjects(workspaceId: string) {
  return apiClient.get<Project[]>(`/api/v1/workspaces/${workspaceId}/projects`)
}

// pmRequestBody -- PMTarget FE jadi bentuk request backend (pm_user_id ATAU
// pm_email+pm_name, PERSIS SATU -- lihat AddProjectModal.dc.html/
// ProjectService.resolvePM).
function pmRequestBody(pm: PMTarget) {
  return pm.userId ? { pm_user_id: pm.userId } : { pm_email: pm.email, pm_name: pm.name }
}

export function createProject(workspaceId: string, input: { name: string; code: string; pm: PMTarget }) {
  return apiClient.post<Project>(`/api/v1/workspaces/${workspaceId}/projects`, { name: input.name, code: input.code, ...pmRequestBody(input.pm) })
}

export function updateProject(projectId: string, input: { name: string }) {
  return apiClient.put<{ id: string; name: string }>(`/api/v1/projects/${projectId}`, input)
}

// assignProjectPM/removeProjectPM (S4W susulan) -- seksi PM panel Kelola,
// terpisah dari updateProject (nama).
export function assignProjectPM(projectId: string, pm: PMTarget) {
  return apiClient.post<{ id: string }>(`/api/v1/projects/${projectId}/pm`, pmRequestBody(pm))
}

export function removeProjectPM(projectId: string) {
  return apiClient.delete<{ id: string }>(`/api/v1/projects/${projectId}/pm`)
}

export function setProjectArchived(projectId: string, archive: boolean) {
  const action = archive ? 'archive' : 'unarchive'
  return apiClient.put<{ id: string; is_archived: boolean }>(`/api/v1/projects/${projectId}/${action}`)
}

export function deleteProject(projectId: string) {
  return apiClient.delete<void>(`/api/v1/projects/${projectId}`)
}

// restoreProject -- Data Retention: batalkan soft-delete deleteProject di
// atas.
export function restoreProject(projectId: string) {
  return apiClient.post<{ id: string }>(`/api/v1/projects/${projectId}/restore`)
}
