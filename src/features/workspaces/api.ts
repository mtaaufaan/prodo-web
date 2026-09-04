import { apiClient } from '@/lib/api'

import type { CandidateAdmin, ReassignAdminFormValues, UpdateWorkspaceFormValues, Workspace, WorkspaceListRow } from './types'

// listWorkspacesByGroup -- GET /workspaces?group_id= (S4G-05, Track S4G),
// grid lintas organisasi dalam satu grup. groupId kosong -- Platform Admin
// bare-render (lihat komentar CreateOrganizationModal/WorkspaceListPage).
export function listWorkspacesByGroup(groupId: string | undefined) {
  const params = groupId ? `?group_id=${groupId}` : ''
  return apiClient.get<WorkspaceListRow[]>(`/api/v1/workspaces${params}`)
}

export function listCandidateAdmins(orgId: string) {
  return apiClient.get<CandidateAdmin[]>(`/api/v1/organizations/${orgId}/candidate-admins`)
}

export function getWorkspace(id: string) {
  return apiClient.get<Workspace>(`/api/v1/workspaces/${id}`)
}

// createWorkspace -- body PERSIS SATU dari admin_workspace_user_id ATAU
// admin_workspace_email(+admin_workspace_name) diisi (S4G-05, Track S4G) --
// caller (CreateWorkspaceModal) yang menyaring field sesuai tab aktif
// sebelum memanggil ini, bukan mengirim form values mentah.
export function createWorkspace(
  orgId: string,
  values: { name: string; admin_workspace_user_id?: string; admin_workspace_email?: string; admin_workspace_name?: string },
) {
  return apiClient.post<{ id: string }>(`/api/v1/organizations/${orgId}/workspaces`, values)
}

export function updateWorkspace(id: string, values: Pick<UpdateWorkspaceFormValues, 'name'>) {
  return apiClient.put<{ id: string }>(`/api/v1/workspaces/${id}`, values)
}

export function moveWorkspace(id: string, targetOrgId: string) {
  return apiClient.put<{ id: string; org_id: string }>(`/api/v1/workspaces/${id}/move`, { target_org_id: targetOrgId })
}

export function reassignWorkspaceAdmin(id: string, values: ReassignAdminFormValues) {
  return apiClient.put<{ id: string; admin_workspace_user_id: string }>(`/api/v1/workspaces/${id}/admin`, values)
}

export function archiveWorkspace(id: string) {
  return apiClient.put<{ id: string; archived: boolean }>(`/api/v1/workspaces/${id}/archive`)
}

export function unarchiveWorkspace(id: string) {
  return apiClient.put<{ id: string; archived: boolean }>(`/api/v1/workspaces/${id}/unarchive`)
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
