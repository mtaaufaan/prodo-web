import { apiClient } from '@/lib/api'

import type { CreateInvitationsResult, PendingInvitation, WorkspaceMember } from './types'

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

export function listPendingInvitations(workspaceId: string) {
  return apiClient
    .get<{ pending_invitations: PendingInvitation[] }>(`/api/v1/workspaces/${workspaceId}/invitations`)
    .then((res) => res.pending_invitations)
}

export function createInvitations(workspaceId: string, emails: string[], role: string) {
  return apiClient.post<CreateInvitationsResult>(`/api/v1/workspaces/${workspaceId}/invitations`, { emails, role })
}

export function cancelInvitation(workspaceId: string, invitationId: string) {
  return apiClient.delete<void>(`/api/v1/workspaces/${workspaceId}/invitations/${invitationId}`)
}

export function resendInvitation(workspaceId: string, invitationId: string) {
  return apiClient.post<{ message: string }>(`/api/v1/workspaces/${workspaceId}/invitations/${invitationId}/resend`)
}
