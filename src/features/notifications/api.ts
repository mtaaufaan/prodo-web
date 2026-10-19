import { apiClient } from '@/lib/api'

import type { NotificationPage } from './types'

export function getNotifications(workspaceId: string, page: number, perPage: number) {
  return apiClient.get<NotificationPage>('/api/v1/me/notifications', { params: { workspace_id: workspaceId, page, per_page: perPage } })
}

export function markNotificationRead(id: string) {
  return apiClient.patch<{ id: string }>(`/api/v1/me/notifications/${id}/read`)
}

export function markAllNotificationsRead(workspaceId: string) {
  return apiClient.post<{ updated: number }>('/api/v1/me/notifications/read-all', { workspace_id: workspaceId })
}
