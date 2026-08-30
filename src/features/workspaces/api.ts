import { apiClient } from '@/lib/api'

import type { CreateWorkspaceFormValues, UpdateWorkspaceFormValues, Workspace } from './types'

export function listWorkspaces(orgId: string) {
  return apiClient.get<Workspace[]>(`/api/v1/organizations/${orgId}/workspaces`)
}

export function getWorkspace(id: string) {
  return apiClient.get<Workspace>(`/api/v1/workspaces/${id}`)
}

export function createWorkspace(orgId: string, values: CreateWorkspaceFormValues) {
  return apiClient.post<{ id: string }>(`/api/v1/organizations/${orgId}/workspaces`, values)
}

export function updateWorkspace(id: string, values: UpdateWorkspaceFormValues) {
  return apiClient.put<{ id: string }>(`/api/v1/workspaces/${id}`, values)
}

export function deactivateWorkspace(id: string) {
  return apiClient.put<{ id: string; deactivated: boolean }>(`/api/v1/workspaces/${id}/deactivate`)
}

export function reactivateWorkspace(id: string) {
  return apiClient.put<{ id: string; deactivated: boolean }>(`/api/v1/workspaces/${id}/reactivate`)
}

export function deleteWorkspace(id: string) {
  return apiClient.delete<void>(`/api/v1/workspaces/${id}`)
}
