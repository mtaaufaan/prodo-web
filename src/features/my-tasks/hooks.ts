import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { commentKeys } from '@/features/tasks/comments'
import { taskKeys } from '@/features/tasks/hooks'

import { listMyTasks, postTaskComment } from './api'
import type { MyTaskView } from './types'

// Prefiks ['tasks','mine', ...] -- ikut tervalidasi saat useSetTaskStatus
// menginvalidasi [...taskKeys.all, 'mine'] (lihat features/tasks/hooks.ts).
export const myTaskKeys = {
  all: [...taskKeys.all, 'mine'] as const,
  list: (projectId: string, view: MyTaskView, page: number, perPage: number) => [...myTaskKeys.all, projectId, view, page, perPage] as const,
}

// staleTime 0: pindah status/komentar dari halaman lain (Board, Task Detail) harus langsung tampak.
// keepPreviousData: ganti halaman/tab tanpa layar kosong.
export function useMyTasks(projectId: string, view: MyTaskView, page: number, perPage: number) {
  return useQuery({
    queryKey: myTaskKeys.list(projectId, view, page, perPage),
    queryFn: () => listMyTasks(projectId, view, page, perPage),
    enabled: Boolean(projectId),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

export function usePostComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: string }) => postTaskComment(taskId, body),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(vars.taskId) })
      return queryClient.invalidateQueries({ queryKey: myTaskKeys.all })
    },
  })
}
