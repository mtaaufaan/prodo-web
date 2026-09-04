import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { cancelInvitation, createInvitations, removeMember, resendInvitation, updateMemberRole } from '@/features/workspace-members/api'

import {
  deactivateMemberAccess,
  inviteExecutive,
  listGroupMembers,
  reactivateMemberAccess,
  toggleExecutive,
  updateMemberIdentity,
} from './api'

export const memberKeys = {
  all: ['group-members'] as const,
  directory: (groupId: string) => [...memberKeys.all, groupId] as const,
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: memberKeys.directory(groupId),
    queryFn: () => listGroupMembers(groupId),
    enabled: groupId !== '',
  })
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, groupId: string) {
  queryClient.invalidateQueries({ queryKey: memberKeys.directory(groupId) })
}

export function useToggleExecutive(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, assign }: { userId: string; assign: boolean }) => toggleExecutive(groupId, userId, assign),
    onSuccess: () => invalidate(queryClient, groupId),
  })
}

export function useUpdateMemberIdentity(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, displayName, title }: { userId: string; displayName: string; title: string }) =>
      updateMemberIdentity(groupId, userId, displayName, title),
    onSuccess: () => invalidate(queryClient, groupId),
  })
}

export function useDeactivateMember(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => deactivateMemberAccess(groupId, userId),
    onSuccess: () => invalidate(queryClient, groupId),
  })
}

export function useReactivateMember(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => reactivateMemberAccess(groupId, userId),
    onSuccess: () => invalidate(queryClient, groupId),
  })
}

export function useInviteExecutive(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => inviteExecutive(groupId, email),
    onSuccess: () => invalidate(queryClient, groupId),
  })
}

// useAssignWorkspaceRole -- reuse penuh workspace-members API (§4G-05/S2-05):
// panel Kelola Member "ROLE PER WORKSPACE" (ubah role existing ATAU
// "+ TAMBAH AKSES WORKSPACE LAIN", termasuk lintas organisasi dalam grup
// yang sama -- endpoint sudah tidak dibatasi organisasi).
export function useAssignWorkspaceRole(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, userId, role }: { workspaceId: string; userId: string; role: string }) =>
      updateMemberRole(workspaceId, userId, role),
    onSuccess: () => invalidate(queryClient, groupId),
  })
}

export function useRevokeWorkspaceRole(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) => removeMember(workspaceId, userId),
    onSuccess: () => invalidate(queryClient, groupId),
  })
}

// useInviteWorkspaceMembers -- modal "Undang Member" mode manual: loop
// panggil createInvitations (sudah terima array email) SEKALI PER pasangan
// workspace+role yang dipilih user -- reuse penuh, tidak ada endpoint bulk
// baru di backend untuk kasus lintas-workspace ini.
export function useInviteWorkspaceMembers(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (targets: { workspaceId: string; role: string; emails: string[] }[]) => {
      const results = await Promise.all(targets.map((t) => createInvitations(t.workspaceId, t.emails, t.role)))
      return results
    },
    onSuccess: () => invalidate(queryClient, groupId),
  })
}

export function useResendPendingInvite(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, invitationId }: { workspaceId: string; invitationId: string }) =>
      resendInvitation(workspaceId, invitationId),
    onSuccess: () => invalidate(queryClient, groupId),
  })
}

export function useCancelPendingInvite(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, invitationId }: { workspaceId: string; invitationId: string }) =>
      cancelInvitation(workspaceId, invitationId),
    onSuccess: () => invalidate(queryClient, groupId),
  })
}
