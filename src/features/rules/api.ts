import { apiClient } from '@/lib/api'

import type { CreateRuleValues, Rule, RuleExecution } from './types'

export function getRules(workspaceId: string) {
  return apiClient.get<Rule[]>(`/api/v1/workspaces/${workspaceId}/rules`)
}

export function createRule(workspaceId: string, values: CreateRuleValues) {
  return apiClient.post<{ id: string }>(`/api/v1/workspaces/${workspaceId}/rules`, values)
}

export function toggleRuleActive(ruleId: string, active: boolean) {
  return apiClient.patch<{ id: string; active: boolean }>(`/api/v1/rules/${ruleId}/toggle-active`, { active })
}

export function deleteRule(ruleId: string) {
  return apiClient.delete<{ id: string }>(`/api/v1/rules/${ruleId}`)
}

export function getRuleExecutions(workspaceId: string, status: string) {
  return apiClient.get<RuleExecution[]>(`/api/v1/workspaces/${workspaceId}/rules/executions`, { params: { status } })
}

export function exportRuleExecutionsCSV(workspaceId: string, status: string) {
  return apiClient.get<Blob>(`/api/v1/workspaces/${workspaceId}/rules/executions`, {
    params: { status, export: 'csv' },
    responseType: 'blob',
  })
}
