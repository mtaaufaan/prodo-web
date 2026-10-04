import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { listPicGroups, replacePicGroup } from './api'

export const picGroupKeys = {
  list: (projectId: string) => ['pic-groups', projectId] as const,
}

export function usePicGroups(projectId: string) {
  return useQuery({
    queryKey: picGroupKeys.list(projectId),
    queryFn: () => listPicGroups(projectId),
    enabled: projectId !== '',
    // Audit/hasil konfigurasi dipakai gate handoff -- selalu ambil yang terbaru.
    staleTime: 0,
  })
}

export function useReplacePicGroup(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ statusId, userIds }: { statusId: string; userIds: string[] }) => replacePicGroup(projectId, statusId, userIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: picGroupKeys.list(projectId) }),
  })
}
