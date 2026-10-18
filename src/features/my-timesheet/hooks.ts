import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { myTaskKeys } from '@/features/my-tasks/hooks'

import { getMyHours, postTimeLog } from './api'
import type { TimesheetView } from './types'

export const myHoursKeys = {
  all: ['my-hours'] as const,
  list: (workspaceId: string, view: TimesheetView, page: number, perPage: number) => [...myHoursKeys.all, workspaceId, view, page, perPage] as const,
}

// staleTime 0: jam yang dicatat dari Task Detail/halaman lain harus langsung tampak.
export function useMyHours(workspaceId: string, view: TimesheetView, page: number, perPage: number) {
  return useQuery({
    queryKey: myHoursKeys.list(workspaceId, view, page, perPage),
    queryFn: () => getMyHours(workspaceId, view, page, perPage),
    enabled: Boolean(workspaceId),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

export function useLogTime() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, hours, note }: { taskId: string; hours: number; note: string }) => postTimeLog(taskId, hours, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myHoursKeys.all })
      // kartu "JAM TERCATAT" Task Saya ikut berubah
      return queryClient.invalidateQueries({ queryKey: myTaskKeys.all })
    },
  })
}
