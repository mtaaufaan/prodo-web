import { apiClient } from '@/lib/api'

import type { Webhook, WebhookDelivery, WebhookFormValues } from './types'

export function getWebhooks(groupId: string) {
  return apiClient.get<Webhook[]>(`/api/v1/groups/${groupId}/webhooks`)
}

export function createWebhook(groupId: string, values: WebhookFormValues) {
  return apiClient.post<{ id: string; secret: string }>(`/api/v1/groups/${groupId}/webhooks`, values)
}

export function updateWebhook(groupId: string, webhookId: string, values: WebhookFormValues) {
  return apiClient.put<{ id: string }>(`/api/v1/groups/${groupId}/webhooks/${webhookId}`, values)
}

export function toggleWebhookActive(groupId: string, webhookId: string, active: boolean) {
  return apiClient.patch<{ id: string; active: boolean }>(`/api/v1/groups/${groupId}/webhooks/${webhookId}/toggle-active`, { active })
}

export function regenerateWebhookSecret(groupId: string, webhookId: string) {
  return apiClient.post<{ secret: string }>(`/api/v1/groups/${groupId}/webhooks/${webhookId}/regenerate-secret`)
}

export function deleteWebhook(groupId: string, webhookId: string) {
  return apiClient.delete<{ id: string }>(`/api/v1/groups/${groupId}/webhooks/${webhookId}`)
}

export function testWebhook(groupId: string, webhookId: string) {
  return apiClient.post<{ delivered: boolean; duration_ms: number }>(`/api/v1/groups/${groupId}/webhooks/${webhookId}/test`)
}

export function getWebhookDeliveries(groupId: string, status: string, webhookId: string) {
  return apiClient.get<WebhookDelivery[]>(`/api/v1/groups/${groupId}/webhooks/deliveries`, {
    params: { status, webhook_id: webhookId },
  })
}
