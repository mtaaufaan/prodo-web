import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createRule, deleteRule, getRuleExecutions, getRules, toggleRuleActive } from './api'
import type { CreateRuleValues } from './types'

export const ruleKeys = {
  all: ['rules'] as const,
  list: (workspaceId: string) => [...ruleKeys.all, 'list', workspaceId] as const,
  executions: (workspaceId: string, status: string) => [...ruleKeys.all, 'executions', workspaceId, status] as const,
}

export function useRules(workspaceId: string) {
  return useQuery({
    queryKey: ruleKeys.list(workspaceId),
    queryFn: () => getRules(workspaceId),
    enabled: workspaceId !== '',
  })
}

export function useRuleExecutions(workspaceId: string, status: string) {
  return useQuery({
    queryKey: ruleKeys.executions(workspaceId, status),
    queryFn: () => getRuleExecutions(workspaceId, status),
    enabled: workspaceId !== '',
  })
}

export function useCreateRule(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CreateRuleValues) => createRule(workspaceId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ruleKeys.list(workspaceId) }),
  })
}

export function useToggleRuleActive(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ruleId, active }: { ruleId: string; active: boolean }) => toggleRuleActive(ruleId, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ruleKeys.list(workspaceId) }),
  })
}

export function useDeleteRule(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: string) => deleteRule(ruleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ruleKeys.list(workspaceId) }),
  })
}
