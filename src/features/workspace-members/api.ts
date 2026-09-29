import { apiClient } from '@/lib/api'

import type { CreateInvitationsResult, PendingInvitation, WorkspaceMember, WorkspaceMemberCandidate } from './types'

// listWorkspaceMembersResponse -- respons LENGKAP GET .../members, dua
// array: workspace_members (member biasa) + project_scoped_members
// (susulan, dikonfirmasi user "tampil dan bisa dikelola penuh dari sini
// juga": PM/editor/approver/viewer TANPA baris workspace_members). Bentuk
// objek kedua array SAMA (WorkspaceMember) -- baris project_scoped_members
// dikelola lewat endpoint /projects/:id/members, bukan endpoint di bawah
// (lihat useUpdateMemberRole/useRemoveMember vs useUpdateProjectMemberRole/
// useRemoveProjectMember, WorkspaceMembersPage).
export function listWorkspaceMembersResponse(workspaceId: string) {
  return apiClient.get<{ workspace_members: WorkspaceMember[]; project_scoped_members: WorkspaceMember[] }>(
    `/api/v1/workspaces/${workspaceId}/members`,
  )
}

export function updateMemberRole(workspaceId: string, userId: string, role: string, projectId?: string) {
  return apiClient.put<{ previous_role: string; role: string }>(
    `/api/v1/workspaces/${workspaceId}/members/${userId}/role`,
    { role, project_id: projectId || undefined },
  )
}

// projectId (susulan 2026-09-14, dikonfirmasi user setelah screenshot Fia/
// IT-Eldwin: "jika pm dan editor approver viewer, hanya dikeluarkan dari
// project") -- keterkaitan project member ini SAAT INI (WorkspaceMember.
// project_id), dikirim untuk role project-scoped supaya backend tahu
// project mana yang dilepas kalau dia kebetulan terkait >1 project.
export function removeMember(workspaceId: string, userId: string, projectId?: string) {
  return apiClient.delete<void>(`/api/v1/workspaces/${workspaceId}/members/${userId}`, {
    params: projectId ? { project_id: projectId } : undefined,
  })
}

export function listPendingInvitations(workspaceId: string) {
  return apiClient
    .get<{ pending_invitations: PendingInvitation[] }>(`/api/v1/workspaces/${workspaceId}/invitations`)
    .then((res) => res.pending_invitations)
}

export function createInvitations(workspaceId: string, emails: string[], role: string, projectId?: string) {
  return apiClient.post<CreateInvitationsResult>(`/api/v1/workspaces/${workspaceId}/invitations`, {
    emails,
    role,
    project_id: projectId || undefined,
  })
}

export function cancelInvitation(workspaceId: string, invitationId: string) {
  return apiClient.delete<void>(`/api/v1/workspaces/${workspaceId}/invitations/${invitationId}`)
}

export function resendInvitation(workspaceId: string, invitationId: string) {
  return apiClient.post<{ message: string }>(`/api/v1/workspaces/${workspaceId}/invitations/${invitationId}/resend`)
}

// S4W-02: "pool kandidat" modal Undang Member.
export function listWorkspaceMemberCandidates(workspaceId: string) {
  return apiClient.get<WorkspaceMemberCandidate[]>(`/api/v1/workspaces/${workspaceId}/member-candidates`)
}
