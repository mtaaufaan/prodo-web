import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createWorkspace,
  deactivateWorkspace,
  deleteWorkspace,
  getWorkspace,
  listWorkspaces,
  reactivateWorkspace,
  updateWorkspace,
} from './api'
import type { CreateWorkspaceFormValues, UpdateWorkspaceFormValues } from './types'

export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: (orgId: string) => [...workspaceKeys.all, 'list', orgId] as const,
}

const workspaceListQuery = (orgId: string) =>
  queryOptions({
    queryKey: workspaceKeys.list(orgId),
    queryFn: () => listWorkspaces(orgId),
    enabled: orgId !== '',
  })

export function useWorkspaceList(orgId: string) {
  return useQuery(workspaceListQuery(orgId))
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

export function useCreateWorkspace(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CreateWorkspaceFormValues) => createWorkspace(orgId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.list(orgId) }),
  })
}

export function useUpdateWorkspace(orgId: string, id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: UpdateWorkspaceFormValues) => updateWorkspace(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.list(orgId) }),
  })
}

export function useDeactivateWorkspace(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateWorkspace(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.list(orgId) }),
  })
}

export function useReactivateWorkspace(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reactivateWorkspace(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.list(orgId) }),
  })
}

export function useDeleteWorkspace(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.list(orgId) }),
  })
}
