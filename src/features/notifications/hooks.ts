import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { getNotifications, markAllNotificationsRead, markNotificationRead } from './api'

export const PAGE_SIZE = 10
const POLL_MS = 60_000

export const notificationKeys = { workspace: (workspaceId: string) => ['notifications', workspaceId] as const }

// Daftar notifikasi (semua halaman yang sudah dimuat) + hitung belum dibaca dari halaman pertama.
// Di-poll tiap menit supaya badge ikut naik tanpa reload.
export function useNotifications(workspaceId: string) {
  return useInfiniteQuery({
    queryKey: notificationKeys.workspace(workspaceId),
    queryFn: ({ pageParam }) => getNotifications(workspaceId, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (pages.length * PAGE_SIZE < last.total ? pages.length + 1 : undefined),
    enabled: workspaceId !== '',
    refetchInterval: POLL_MS,
  })
}

export function useMarkNotificationRead(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.workspace(workspaceId) }),
  })
}

export function useMarkAllNotificationsRead(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markAllNotificationsRead(workspaceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.workspace(workspaceId) }),
  })
}
