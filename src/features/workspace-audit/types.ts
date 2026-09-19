// Audit Trail Workspace (S4W-16/17, US-058, desain "AW Audit
// Trail.dc.html"). Baca langsung dari `audit_logs` (pola sama GA Audit
// Trail) + digabung feed "Log Eksekusi" Rule Automation.
export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS'

export interface WorkspaceAuditLogEntry {
  id: string
  actor_id: string | null
  actor_email: string | null
  actor_display_name: string | null
  actor_role: string | null
  action: string
  type: AuditActionType
  entity_type: string
  entity_id: string | null
  target_name: string | null
  actor_ip: string | null
  request_path: string | null
  state_before: Record<string, unknown> | null
  state_after: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  logged_at: string
}

export interface WorkspaceAuditActor {
  id: string
  name: string
}

export interface WorkspaceAuditLogFilter {
  actor_id?: string
  action_type?: string
  days?: number
}

export interface RuleExecutionEntry {
  id: string
  rule_id: string
  rule_name: string
  trigger_event: Record<string, unknown>
  triggered_by: string | null
  executed_at: string
  status: 'completed' | 'failed'
  action_taken: Record<string, unknown>
  error_message: string | null
  task_code: string | null
  task_title: string | null
}
