import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createProjectRule,
  createRule,
  deleteRule,
  getProjectRuleExecutions,
  getProjectRules,
  getRuleExecutions,
  getRules,
  toggleRuleActive,
} from './api'
import type { CreateRuleValues } from './types'

export const ruleKeys = {
  all: ['rules'] as const,
  list: (workspaceId: string) => [...ruleKeys.all, 'list', workspaceId] as const,
  executions: (workspaceId: string, status: string) => [...ruleKeys.all, 'executions', workspaceId, status] as const,
  projectList: (projectId: string) => [...ruleKeys.all, 'project-list', projectId] as const,
  projectExecutions: (projectId: string, status: string) => [...ruleKeys.all, 'project-executions', projectId, status] as const,
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

// useProjectRules/useProjectRuleExecutions/useCreateProjectRule/
// useToggleProjectRuleActive/useDeleteProjectRule (Track S5B, "Rule
// Builder.dc.html") -- toggle/delete reuse fungsi API workspace di atas
// (backend meresolve scope dari ruleId sendiri), cuma invalidasi query key
// project yang beda.
export function useProjectRules(projectId: string) {
  return useQuery({
    queryKey: ruleKeys.projectList(projectId),
    queryFn: () => getProjectRules(projectId),
    enabled: projectId !== '',
  })
}

export function useProjectRuleExecutions(projectId: string, status: string) {
  return useQuery({
    queryKey: ruleKeys.projectExecutions(projectId, status),
    queryFn: () => getProjectRuleExecutions(projectId, status),
    enabled: projectId !== '',
  })
}

export function useCreateProjectRule(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CreateRuleValues) => createProjectRule(projectId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ruleKeys.projectList(projectId) }),
  })
}

export function useToggleProjectRuleActive(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ruleId, active }: { ruleId: string; active: boolean }) => toggleRuleActive(ruleId, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ruleKeys.projectList(projectId) }),
  })
}

export function useDeleteProjectRule(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: string) => deleteRule(ruleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ruleKeys.projectList(projectId) }),
  })
}
