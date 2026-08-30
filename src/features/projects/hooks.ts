import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createProject, deleteProject, listProjects, setProjectArchived, updateProject } from './api'

export const projectKeys = {
  all: ['projects'] as const,
  list: (workspaceId: string) => [...projectKeys.all, 'list', workspaceId] as const,
}

const projectsListQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: projectKeys.list(workspaceId),
    queryFn: () => listProjects(workspaceId),
    enabled: Boolean(workspaceId),
  })

export function useProjects(workspaceId: string) {
  return useQuery(projectsListQuery(workspaceId))
}

export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; code: string; pm_user_id: string }) => createProject(workspaceId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) }),
  })
}

export function useUpdateProject(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: { name: string; pm_user_id?: string } }) =>
      updateProject(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) }),
  })
}

export function useSetProjectArchived(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, archive }: { projectId: string; archive: boolean }) => setProjectArchived(projectId, archive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) }),
  })
}

export function useDeleteProject(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) }),
  })
}
