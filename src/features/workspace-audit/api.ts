import { apiClient } from '@/lib/api'

import type { AuditScope, RuleExecutionEntry, WorkspaceAuditActor, WorkspaceAuditLogEntry, WorkspaceAuditLogFilter } from './types'

// auditBase -- Audit Trail Workspace (Admin Workspace) dan Audit Trail PM
// (IG-130) memakai bentuk respons yang SAMA; hanya pangkal URL yang beda.
function auditBase(scope: AuditScope): string {
  return scope.kind === 'project' ? `/api/v1/projects/${scope.projectId}/audit-logs` : `/api/v1/workspaces/${scope.workspaceId}/audit-logs`
}

// listAuditLogs -- per_page dipatok tinggi (200) sekali ambil, filter halaman
// dilakukan di klien -- pola sama listGroupAuditLogs.
export function listAuditLogs(scope: AuditScope, filter: WorkspaceAuditLogFilter) {
  return apiClient.get<WorkspaceAuditLogEntry[]>(auditBase(scope), { params: { ...filter, per_page: 200 } })
}

export function getAuditActors(scope: AuditScope) {
  return apiClient.get<WorkspaceAuditActor[]>(`${auditBase(scope)}/actors`)
}

export function exportAuditLogsCSV(scope: AuditScope, filter: WorkspaceAuditLogFilter) {
  return apiClient.get<Blob>(auditBase(scope), { params: { ...filter, export: 'csv' }, responseType: 'blob' })
}

export function getAuditRuleExecutions(scope: AuditScope) {
  return apiClient.get<RuleExecutionEntry[]>(`${auditBase(scope)}/rule-executions`)
}
