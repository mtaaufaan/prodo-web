import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { taskKeys } from '@/features/tasks/hooks'

import { listMyTasks, postTaskComment } from './api'

// Prefiks ['tasks','mine', ...] -- ikut tervalidasi saat useSetTaskStatus
// menginvalidasi [...taskKeys.all, 'mine'] (lihat features/tasks/hooks.ts).
export const myTaskKeys = {
  list: (projectId: string) => [...taskKeys.all, 'mine', projectId] as const,
}

// staleTime 0: pindah status/komentar dari halaman lain (Board, Task Detail) harus langsung tampak.
export function useMyTasks(projectId: string) {
  return useQuery({
    queryKey: myTaskKeys.list(projectId),
    queryFn: () => listMyTasks(projectId),
    enabled: Boolean(projectId),
    staleTime: 0,
  })
}

export function usePostComment(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, body, mentions }: { taskId: string; body: string; mentions: number }) => postTaskComment(taskId, { body, mentions }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myTaskKeys.list(projectId) }),
  })
}
