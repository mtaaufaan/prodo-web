import { apiClient } from '@/lib/api'

import type { Webhook, WebhookDelivery, WebhookFormValues, WorkspaceWebhookFormValues } from './types'

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

// Cakupan workspace (S4W-14, US-054, "AW Webhook.dc.html"+"AW Add Webhook.
// dc.html") -- endpoint terpisah dari cakupan grup di atas (guard AW-only
// ditegakkan backend), tapi ToggleActive/RegenerateSecret/Delete/Test
// beroperasi per webhookId TANPA parameter cakupan di body/handler --
// hanya path-nya yang beda (dijamin backend tidak bisa lintas cakupan lewat
// RLS+authorizeWorkspace).
export function getWorkspaceWebhooks(workspaceId: string) {
  return apiClient.get<Webhook[]>(`/api/v1/workspaces/${workspaceId}/webhooks`)
}

export function createWorkspaceWebhook(workspaceId: string, values: WorkspaceWebhookFormValues) {
  return apiClient.post<{ id: string; secret: string }>(`/api/v1/workspaces/${workspaceId}/webhooks`, values)
}

// updateWorkspaceWebhook -- Kelola (susulan, dikonfirmasi user "tambahkan
// kelola juga seperti GA"), edit nama/url/LINGKUP/events endpoint yang
// sudah ada.
export function updateWorkspaceWebhook(workspaceId: string, webhookId: string, values: WorkspaceWebhookFormValues) {
  return apiClient.put<{ id: string }>(`/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}`, values)
}

export function toggleWorkspaceWebhookActive(workspaceId: string, webhookId: string, active: boolean) {
  return apiClient.patch<{ id: string; active: boolean }>(`/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}/toggle-active`, { active })
}

export function regenerateWorkspaceWebhookSecret(workspaceId: string, webhookId: string) {
  return apiClient.post<{ secret: string }>(`/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}/regenerate-secret`)
}

export function deleteWorkspaceWebhook(workspaceId: string, webhookId: string) {
  return apiClient.delete<{ id: string }>(`/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}`)
}

export function testWorkspaceWebhook(workspaceId: string, webhookId: string) {
  return apiClient.post<{ delivered: boolean; duration_ms: number }>(`/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}/test`)
}

export function getWorkspaceWebhookDeliveries(workspaceId: string, status: string, webhookId: string) {
  return apiClient.get<WebhookDelivery[]>(`/api/v1/workspaces/${workspaceId}/webhooks/deliveries`, {
    params: { status, webhook_id: webhookId },
  })
}
