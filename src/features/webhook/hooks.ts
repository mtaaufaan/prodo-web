import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  getWebhooks,
  regenerateWebhookSecret,
  testWebhook,
  toggleWebhookActive,
  updateWebhook,
} from './api'
import type { WebhookFormValues } from './types'

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
