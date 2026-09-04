import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  archiveWorkspace,
  createWorkspace,
  deactivateWorkspace,
  deleteWorkspace,
  getWorkspace,
  listCandidateAdmins,
  listWorkspacesByGroup,
  moveWorkspace,
  reactivateWorkspace,
  reassignWorkspaceAdmin,
  unarchiveWorkspace,
  updateWorkspace,
} from './api'
import type { ReassignAdminFormValues } from './types'

export const workspaceKeys = {
  all: ['workspaces'] as const,
  listByGroup: (groupId: string | undefined) => [...workspaceKeys.all, 'list-by-group', groupId ?? ''] as const,
  candidateAdmins: (orgId: string) => [...workspaceKeys.all, 'candidate-admins', orgId] as const,
}

// useWorkspaceListByGroup -- S4G-05, Track S4G: grid lintas organisasi
// dalam satu grup (menu "Workspace" GroupAdminLayout). groupId undefined --
// Platform Admin bare-render, sama pola useOrganizationList.
export function useWorkspaceListByGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.listByGroup(groupId),
    queryFn: () => listWorkspacesByGroup(groupId),
  })
}

export function useCandidateAdmins(orgId: string) {
  return useQuery({
    queryKey: workspaceKeys.candidateAdmins(orgId),
    queryFn: () => listCandidateAdmins(orgId),
    enabled: orgId !== '',
  })
}

const workspaceQuery = (id: string) =>
  queryOptions({
    queryKey: [...workspaceKeys.all, 'detail', id] as const,
    queryFn: () => getWorkspace(id),
    enabled: id !== '',
  })

// S4-04 prasyarat: nama workspace untuk header WorkspaceLayout.
export function useWorkspace(id: string) {
  return useQuery(workspaceQuery(id))
}

function invalidateWorkspaceLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
}

export function useCreateWorkspace(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { name: string; admin_workspace_user_id?: string; admin_workspace_email?: string; admin_workspace_name?: string }) =>
      createWorkspace(orgId, values),
    onSuccess: () => invalidateWorkspaceLists(queryClient),
  })
}

export function useUpdateWorkspace(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => updateWorkspace(id, { name }),
    onSuccess: () => invalidateWorkspaceLists(queryClient),
  })
}

export function useMoveWorkspace(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (targetOrgId: string) => moveWorkspace(id, targetOrgId),
    onSuccess: () => invalidateWorkspaceLists(queryClient),
  })
}

export function useReassignWorkspaceAdmin(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ReassignAdminFormValues) => reassignWorkspaceAdmin(id, values),
    onSuccess: () => invalidateWorkspaceLists(queryClient),
  })
}

export function useArchiveWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveWorkspace(id),
    onSuccess: () => invalidateWorkspaceLists(queryClient),
  })
}

export function useUnarchiveWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => unarchiveWorkspace(id),
    onSuccess: () => invalidateWorkspaceLists(queryClient),
  })
}

export function useDeactivateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateWorkspace(id),
    onSuccess: () => invalidateWorkspaceLists(queryClient),
  })
}

export function useReactivateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reactivateWorkspace(id),
    onSuccess: () => invalidateWorkspaceLists(queryClient),
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: () => invalidateWorkspaceLists(queryClient),
  })
}
