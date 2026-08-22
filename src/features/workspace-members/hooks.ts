import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { listWorkspaceMembers, updateMemberRole } from './api'

export const workspaceMemberKeys = {
  all: ['workspace-members'] as const,
  list: (workspaceId: string) => [...workspaceMemberKeys.all, 'list', workspaceId] as const,
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
