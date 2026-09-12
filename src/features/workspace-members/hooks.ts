import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  cancelInvitation,
  createInvitations,
  listPendingInvitations,
  listWorkspaceMemberCandidates,
  listWorkspaceMembers,
  removeMember,
  resendInvitation,
  updateMemberRole,
} from './api'

export const workspaceMemberKeys = {
  all: ['workspace-members'] as const,
  list: (workspaceId: string) => [...workspaceMemberKeys.all, 'list', workspaceId] as const,
  candidates: (workspaceId: string) => [...workspaceMemberKeys.all, 'candidates', workspaceId] as const,
}

export const invitationKeys = {
  all: ['workspace-invitations'] as const,
  list: (workspaceId: string) => [...invitationKeys.all, 'list', workspaceId] as const,
}

const membersListQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: workspaceMemberKeys.list(workspaceId),
    queryFn: () => listWorkspaceMembers(workspaceId),
    enabled: Boolean(workspaceId),
  })

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery(membersListQuery(workspaceId))
}

// S2-08: real-time update tanpa reload -- invalidateQueries (bukan
// WebSocket sungguhan, sama pola dengan revoke sesi S1-36/H10) supaya
// badge role di tabel langsung update begitu modal berhasil menyimpan.
export function useUpdateMemberRole(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => updateMemberRole(workspaceId, userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.list(workspaceId) }),
  })
}

// S3-15/18: keluarkan member dari workspace.
export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeMember(workspaceId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.list(workspaceId) }),
  })
}

const pendingInvitationsQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: invitationKeys.list(workspaceId),
    queryFn: () => listPendingInvitations(workspaceId),
    enabled: Boolean(workspaceId),
  })

export function usePendingInvitations(workspaceId: string) {
  return useQuery(pendingInvitationsQuery(workspaceId))
}

// S2-26: undangan baru bisa langsung menambahkan member (S2-23 shortcut,
// email sudah terdaftar) -- invalidate KEDUA daftar, bukan cuma invitations.
export function useCreateInvitations(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ emails, role }: { emails: string[]; role: string }) => createInvitations(workspaceId, emails, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.list(workspaceId) })
      queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.list(workspaceId) })
      // Kandidat yang baru ditambahkan (langsung aktif MAUPUN diundang)
      // harus hilang dari pool -- tanpa ini, pool masih menampilkan email
      // yang sudah barusan ditambahkan (ditemukan lewat verifikasi live).
      queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.candidates(workspaceId) })
    },
  })
}

export function useCancelInvitation(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => cancelInvitation(workspaceId, invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationKeys.list(workspaceId) }),
  })
}

export function useResendInvitation(workspaceId: string) {
  return useMutation({
    mutationFn: (invitationId: string) => resendInvitation(workspaceId, invitationId),
  })
}

const memberCandidatesQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: [...workspaceMemberKeys.all, 'candidates', workspaceId] as const,
    queryFn: () => listWorkspaceMemberCandidates(workspaceId),
    enabled: Boolean(workspaceId),
  })

// S4W-02: "pool kandidat" modal Undang Member.
export function useWorkspaceMemberCandidates(workspaceId: string) {
  return useQuery(memberCandidatesQuery(workspaceId))
}
