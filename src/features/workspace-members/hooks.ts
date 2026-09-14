import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { organizationKeys } from '@/features/organizations/hooks'
import { groupAdminKeys } from '@/features/platform-admin/hooks'

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

// Organization.member_count (OrganizationManagementPage) dan GroupAdmin.
// used_member_count (PlatformGroupAdminPage) dihitung backend dari
// COUNT(DISTINCT workspace_members.user_id) -- berubah setiap kali baris
// workspace_members bertambah/berkurang (bukan saat rolenya saja yang
// ganti). Dipanggil dari useCreateInvitations (added_directly) dan
// useRemoveMember di bawah -- sebelumnya cuma workspaceMemberKeys yang
// di-invalidate, kedua angka ini basi sampai reload manual (audit
// 2026-09-13, sama pola bug admin_count yang ditemukan user -- lihat
// implementation_gaps.md IG-69).
function invalidateMemberCountAggregates(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: organizationKeys.all })
  queryClient.invalidateQueries({ queryKey: groupAdminKeys.all })
}

// S2-08: real-time update tanpa reload -- invalidateQueries (bukan
// WebSocket sungguhan, sama pola dengan revoke sesi S1-36/H10) supaya
// badge role di tabel langsung update begitu modal berhasil menyimpan.
//
// projectId (role restructuring 2026-09-14, Kelola Member & Roles): WAJIB
// untuk role project_manager/editor/approver/viewer -- backend menautkan
// ke project_members/pm_user_id project itu, jadi daftar project
// workspace ini ikut di-invalidate (pola sama useCreateInvitations, lihat
// catatan sirkular impor di sana -- key disalin literal).
export function useUpdateMemberRole(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role, projectId }: { userId: string; role: string; projectId?: string }) =>
      updateMemberRole(workspaceId, userId, role, projectId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.list(workspaceId) })
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: ['projects', 'list', workspaceId] })
      }
    },
  })
}

// S3-15/18: keluarkan member dari workspace.
export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.list(workspaceId) })
      invalidateMemberCountAggregates(queryClient)
    },
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
//
// projectId (role restructuring 2026-09-14): diisi untuk role project-level
// (PM/editor/approver/viewer) -- undangan/assign langsung bisa mengubah
// pm_user_id atau project_members project itu (lihat backend
// InvitationService.CreateBulkInvitations), jadi daftar project workspace
// ini ikut di-invalidate. Query key '@/features/projects' TIDAK diimpor
// langsung (projects/hooks.ts sendiri sudah mengimpor workspaceMemberKeys
// dari sini -- import balik akan jadi circular), key-nya disalin literal.
export function useCreateInvitations(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ emails, role, projectId }: { emails: string[]; role: string; projectId?: string }) =>
      createInvitations(workspaceId, emails, role, projectId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.list(workspaceId) })
      queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.list(workspaceId) })
      // Kandidat yang baru ditambahkan (langsung aktif MAUPUN diundang)
      // harus hilang dari pool -- tanpa ini, pool masih menampilkan email
      // yang sudah barusan ditambahkan (ditemukan lewat verifikasi live).
      queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.candidates(workspaceId) })
      invalidateMemberCountAggregates(queryClient)
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: ['projects', 'list', workspaceId] })
      }
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
