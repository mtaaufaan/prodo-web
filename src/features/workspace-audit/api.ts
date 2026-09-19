import { apiClient } from '@/lib/api'

import type { RuleExecutionEntry, WorkspaceAuditActor, WorkspaceAuditLogEntry, WorkspaceAuditLogFilter } from './types'

// listWorkspaceAuditLogs -- per_page dipatok tinggi (200) sekali ambil,
// filter halaman dilakukan di klien -- pola sama listGroupAuditLogs.
export function listWorkspaceAuditLogs(workspaceId: string, filter: WorkspaceAuditLogFilter) {
  return apiClient.get<WorkspaceAuditLogEntry[]>(`/api/v1/workspaces/${workspaceId}/audit-logs`, {
    params: { ...filter, per_page: 200 },
  })
}

export function getWorkspaceAuditActors(workspaceId: string) {
  return apiClient.get<WorkspaceAuditActor[]>(`/api/v1/workspaces/${workspaceId}/audit-logs/actors`)
}

export function exportWorkspaceAuditLogsCSV(workspaceId: string, filter: WorkspaceAuditLogFilter) {
  return apiClient.get<Blob>(`/api/v1/workspaces/${workspaceId}/audit-logs`, {
    params: { ...filter, export: 'csv' },
    responseType: 'blob',
  })
}

export function getWorkspaceRuleExecutions(workspaceId: string) {
  return apiClient.get<RuleExecutionEntry[]>(`/api/v1/workspaces/${workspaceId}/audit-logs/rule-executions`)
}
