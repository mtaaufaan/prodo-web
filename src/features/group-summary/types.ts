import type { GroupAuditLogEntry } from '@/features/group-audit/types'

// Dashboard Ringkasan / Landing Page GA (Track S4G S4G-29/30, desain
// "GA Ringkasan.dc.html"). Murni agregasi dari fitur yang sudah ada
// (Organisasi/Audit Trail/Data Retention/Members & Roles) -- tidak ada
// tabel baru.
export interface GroupSummaryStats {
  org_total: number
  org_active: number
  org_inactive: number
  workspace_total: number
  member_total: number
  pending_invites_total: number
  quota_allocated_bytes: number
  quota_ceiling_bytes: number
  storage_used_bytes: number
}

export interface GroupSummaryOrg {
  id: string
  name: string
  member_count: number
  workspace_count: number
  storage_quota_bytes: number
  storage_used_bytes: number
  deactivated_at: string | null
}

export interface GroupSummaryRetentionItem {
  kind: string
  item_id: string
  item_name: string
  org_name: string
  event_at: string
  total_days: number
  purge_at: string
  days_left: number
}

export interface GroupSummaryPendingInvite {
  id: string
  email: string
  role: string | null
  workspace_name: string | null
  org_name: string | null
  is_executive: boolean
  created_at: string
  expires_at: string
}

export interface GroupSummary {
  stats: GroupSummaryStats
  activity: GroupAuditLogEntry[]
  todos: {
    over_quota_orgs: GroupSummaryOrg[]
    retention_soon: GroupSummaryRetentionItem[]
    pending_invites: GroupSummaryPendingInvite[]
    inactive_orgs: GroupSummaryOrg[]
  }
  org_distribution: GroupSummaryOrg[]
}
