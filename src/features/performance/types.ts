// Performance Dashboard (EPIC 12 Reporting & Analytics, US-075/076/077/078,
// desain "Performance Dashboard.dc.html"). Cakupan Project Manager (satu
// project miliknya) dan Admin Workspace (lintas project workspace) --
// Group Admin sudah ada terpisah (GA Kinerja Grup, US-079).
export interface OnTimeStat {
  priority: string
  done_with_due: number
  on_time: number
  rate_pct: number | null
}

export interface BacklogStat {
  priority: string
  count: number
}

export interface CycleStat {
  status_name: string
  avg_by_priority: Record<string, number>
  avg_hours: number
}

export interface OverdueTaskItem {
  task_code: string | null
  title: string
  project_name: string
  priority: string
  due_date: string
  days_late: number
}

export interface MemberStat {
  user_id: string
  user_name: string
  active_by_priority: Record<string, number>
  total_count: number
  done_count: number
  completion_rate_raw: number
  completion_rate_weighted: number
  avg_completion_hours: number | null
  ack_avg_hours: number | null
  ack_pending_count: number
}

export interface RegressionStat {
  status_name: string
  regressions: number
  sessions: number
  tasks_through: number
  rate_pct: number
}

export interface BottleneckStat {
  status_name: string
  avg_total_hours: number
  avg_queue_hours: number
  avg_active_hours: number
  session_count: number
}

export interface HandoffStat {
  project_id: string
  project_name: string
  avg_hours: number | null
  pending_count: number
}

export interface PerformanceDashboard {
  scope_total: number
  scope_done: number
  completion_rate_raw: number
  completion_rate_weighted: number
  on_time: OnTimeStat[]
  no_due_count: number
  backlog_health: BacklogStat[]
  cycle: CycleStat[]
  overdue: OverdueTaskItem[]
  overdue_total: number
  overdue_critical: number
  members: MemberStat[]
  flow_efficiency_pct: number | null
  lead_time_hours: number
  cycle_time_avg_hours: number | null
  regression_rate_pct: number
  regressed_tasks: number
  regression_by_status: RegressionStat[]
  bottleneck: BottleneckStat[]
  handoff_delay: HandoffStat[]
}

export const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low']
export const PRIORITY_WEIGHT: Record<string, number> = { critical: 5, high: 3, medium: 2, low: 1 }

export function formatHours(hours: number): string {
  if (hours < 1) return Math.round(hours * 60) + ' menit'
  if (hours < 24) return hours.toFixed(1) + ' jam'
  return (hours / 24).toFixed(1) + ' hari'
}
