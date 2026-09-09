// Audit Trail (Track S4G, desain "GA Audit Trail.dc.html"). Baca langsung
// dari `audit_logs` yang sudah ada -- lihat implementation_gaps.md IG-45.
export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS'

export interface GroupAuditLogEntry {
  id: string
  actor_id: string | null
  actor_email: string | null
  actor_display_name: string | null
  actor_role: string | null
  action: string
  type: AuditActionType
  entity_type: string
  entity_id: string | null
  org_name: string | null
  target_name: string | null
  actor_ip: string | null
  state_before: Record<string, unknown> | null
  state_after: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  logged_at: string
}

export interface GroupAuditActor {
  id: string
  name: string
}

export interface GroupAuditLogFilter {
  actor_id?: string
  action_type?: string
  days?: number
}
