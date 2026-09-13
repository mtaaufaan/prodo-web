import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { workspaceMemberKeys } from '@/features/workspace-members/hooks'

import { assignProjectPM, createProject, deleteProject, listProjects, removeProjectPM, restoreProject, setProjectArchived, updateProject } from './api'
import type { PMTarget } from './types'

export const projectKeys = {
  all: ['projects'] as const,
  list: (workspaceId: string) => [...projectKeys.all, 'list', workspaceId] as const,
}

// invalidatePMRoleChange (S4W susulan) -- Create/AssignPM bisa menaikkan
// role seorang workspace member jadi project_manager lewat RBACService.
// AssignRole (server), tapi itu TIDAK otomatis membuat daftar member yang
// sudah di-fetch FE (dipakai picker PM di AddProjectModal/
// ManageProjectModal) ikut ter-refresh -- pola bug basi lintas-folder yang
// sama persis dengan IG-69 (docs/implementation_gaps.md), cuma di
// pasangan folder features/projects <-> features/workspace-members.
function invalidatePMRoleChange(queryClient: ReturnType<typeof useQueryClient>, workspaceId: string) {
  queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.list(workspaceId) })
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
    mutationFn: (input: { name: string; code: string; pm: PMTarget }) => createProject(workspaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) })
      invalidatePMRoleChange(queryClient, workspaceId)
    },
  })
}

export function useUpdateProject(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: { name: string } }) => updateProject(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) }),
  })
}

// useAssignProjectPM/useRemoveProjectPM (S4W susulan) -- seksi PM panel
// Kelola, terpisah dari useUpdateProject (nama).
export function useAssignProjectPM(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, pm }: { projectId: string; pm: PMTarget }) => assignProjectPM(projectId, pm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) })
      invalidatePMRoleChange(queryClient, workspaceId)
    },
  })
}

export function useRemoveProjectPM(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => removeProjectPM(projectId),
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

// useRestoreProject -- TANPA workspaceId (dipakai dari GA Data Retention,
// bukan dari WorkspaceLayout project list) -- invalidasi seluruh
// projectKeys, bukan satu workspace spesifik.
export function useRestoreProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => restoreProject(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  })
}
