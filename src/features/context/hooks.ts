import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getMyContext, getMyProjects, switchContext } from './api'

export const contextKeys = {
  all: ['me-context'] as const,
  projects: (workspaceId: string) => ['me-projects', workspaceId] as const,
}

export function useMyContext() {
  return useQuery({
    queryKey: contextKeys.all,
    queryFn: getMyContext,
  })
}

// useMyProjects -- project yang diikuti user di workspace (S6E-02). staleTime 0: keanggotaan
// berubah saat PM menugaskan task/menambah member.
export function useMyProjects(workspaceId: string) {
  return useQuery({
    queryKey: contextKeys.projects(workspaceId),
    queryFn: () => getMyProjects(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 0,
  })
}

// useWorkspaceCapabilities -- role + capabilities user di workspace (workspace_memberships, lalu
// project-scoped bila bukan anggota workspace). undefined selama konteks belum termuat.
export function useWorkspaceCapabilities(workspaceId: string) {
  const ctx = useMyContext()
  const m = ctx.data?.workspace_memberships.find((w) => w.workspace_id === workspaceId) ?? ctx.data?.project_scoped_projects.find((p) => p.workspace_id === workspaceId)
  return { role: m?.role, capabilities: m?.capabilities, isLoading: ctx.isLoading }
}

export function useSwitchContext() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: switchContext,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contextKeys.all }),
  })
}
