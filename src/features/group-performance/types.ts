// Performance Dashboard Lintas Organisasi (Track S4G, desain "GA Kinerja
// Grup.dc.html", US-079/S4G-25/26). Forward-pull SETELAH Task Management
// Core (Phase 1-4) selesai -- angka di sini REAL, bukan stub kosong/nol
// seperti rencana awal (lihat implementation_gaps.md IG-46/50).
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'

export interface StatusBottleneck {
  status_name: string
  avg_days: number
}

export interface OrgPerformance {
  organization_id: string
  organization_name: string
  workspace_count: number
  total_tasks: number
  completion_rate_raw: number
  completion_rate_weighted: number
  on_time_rate: Partial<Record<TaskPriority, number | null>>
  overdue_count: number
  overdue_critical_count: number
  bottleneck: StatusBottleneck[]
}

export interface GroupPerformanceSummary {
  completion_rate_raw: number
  completion_rate_weighted: number
  total_tasks: number
  overdue_count: number
  overdue_critical_count: number
  bottleneck_status_name: string
  bottleneck_org_name: string
  bottleneck_avg_days: number
}

export interface GroupPerformanceResult {
  summary: GroupPerformanceSummary
  organizations: OrgPerformance[]
}
