import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createWebhook,
  createWorkspaceWebhook,
  deleteWebhook,
  deleteWorkspaceWebhook,
  getWebhookDeliveries,
  getWebhooks,
  getWorkspaceWebhookDeliveries,
  getWorkspaceWebhooks,
  regenerateWebhookSecret,
  regenerateWorkspaceWebhookSecret,
  testWebhook,
  testWorkspaceWebhook,
  toggleWebhookActive,
  toggleWorkspaceWebhookActive,
  updateWebhook,
  updateWorkspaceWebhook,
} from './api'
import type { WebhookFormValues, WorkspaceWebhookFormValues } from './types'

export const webhookKeys = {
  all: ['webhooks'] as const,
  list: (groupId: string) => [...webhookKeys.all, 'list', groupId] as const,
  deliveries: (groupId: string, status: string, webhookId: string) => [...webhookKeys.all, 'deliveries', groupId, status, webhookId] as const,
}

export function useWebhooks(groupId: string) {
  return useQuery({
    queryKey: webhookKeys.list(groupId),
    queryFn: () => getWebhooks(groupId),
    enabled: groupId !== '',
  })
}

export function useWebhookDeliveries(groupId: string, status: string, webhookId: string) {
  return useQuery({
    queryKey: webhookKeys.deliveries(groupId, status, webhookId),
    queryFn: () => getWebhookDeliveries(groupId, status, webhookId),
    enabled: groupId !== '',
  })
}

export function useCreateWebhook(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: WebhookFormValues) => createWebhook(groupId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookKeys.list(groupId) }),
  })
}

export function useUpdateWebhook(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ webhookId, values }: { webhookId: string; values: WebhookFormValues }) => updateWebhook(groupId, webhookId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookKeys.list(groupId) }),
  })
}

export function useToggleWebhookActive(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ webhookId, active }: { webhookId: string; active: boolean }) => toggleWebhookActive(groupId, webhookId, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookKeys.list(groupId) }),
  })
}

export function useRegenerateWebhookSecret(groupId: string) {
  return useMutation({
    mutationFn: (webhookId: string) => regenerateWebhookSecret(groupId, webhookId),
  })
}

export function useDeleteWebhook(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (webhookId: string) => deleteWebhook(groupId, webhookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookKeys.list(groupId) }),
  })
}

export function useTestWebhook(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (webhookId: string) => testWebhook(groupId, webhookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookKeys.all }),
  })
}

// Cakupan workspace (S4W-14) -- reuse bentuk query key yang sama
// (webhookKeys.list/deliveries), workspaceId dipakai di posisi "id" --
// tidak pernah tabrakan dengan groupId (UUID berbeda per baris).
export function useWorkspaceWebhooks(workspaceId: string) {
  return useQuery({
    queryKey: webhookKeys.list(workspaceId),
    queryFn: () => getWorkspaceWebhooks(workspaceId),
    enabled: workspaceId !== '',
  })
}

export function useWorkspaceWebhookDeliveries(workspaceId: string, status: string, webhookId: string) {
  return useQuery({
    queryKey: webhookKeys.deliveries(workspaceId, status, webhookId),
    queryFn: () => getWorkspaceWebhookDeliveries(workspaceId, status, webhookId),
    enabled: workspaceId !== '',
  })
}

export function useCreateWorkspaceWebhook(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: WorkspaceWebhookFormValues) => createWorkspaceWebhook(workspaceId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookKeys.list(workspaceId) }),
  })
}

export function useUpdateWorkspaceWebhook(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ webhookId, values }: { webhookId: string; values: WorkspaceWebhookFormValues }) => updateWorkspaceWebhook(workspaceId, webhookId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookKeys.list(workspaceId) }),
  })
}

export function useToggleWorkspaceWebhookActive(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ webhookId, active }: { webhookId: string; active: boolean }) => toggleWorkspaceWebhookActive(workspaceId, webhookId, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookKeys.list(workspaceId) }),
  })
}

export function useRegenerateWorkspaceWebhookSecret(workspaceId: string) {
  return useMutation({
    mutationFn: (webhookId: string) => regenerateWorkspaceWebhookSecret(workspaceId, webhookId),
  })
}

export function useDeleteWorkspaceWebhook(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (webhookId: string) => deleteWorkspaceWebhook(workspaceId, webhookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookKeys.list(workspaceId) }),
  })
}

export function useTestWorkspaceWebhook(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (webhookId: string) => testWorkspaceWebhook(workspaceId, webhookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookKeys.all }),
  })
}
