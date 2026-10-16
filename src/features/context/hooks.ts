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

export function useSwitchContext() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: switchContext,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contextKeys.all }),
  })
}
