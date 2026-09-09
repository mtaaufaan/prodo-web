// Task Management Core Phase 1/2/3/4 (forward-pull, US-013/014/017/017c/
// 018/018a/018b/018c). Lihat implementation_gaps.md IG-46/47/48/49.
export interface CustomStatus {
  id: string
  name: string
  color_token: string | null
  position: number
  is_system: boolean
  is_undefined: boolean
  require_start_confirmation: boolean
}

export interface Sprint {
  id: string
  project_id: string
  name: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
}

export interface TaskAssignee {
  user_id: string
  display_name: string
  email: string
  role: 'lead' | 'contributor'
}

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'

export interface Task {
  id: string
  project_id: string
  sprint_id: string | null
  sprint_name: string | null
  parent_task_id: string | null
  status_id: string
  status_name: string
  status_color: string | null
  title: string
  description: unknown
  priority: TaskPriority
  completeness: 'complete' | 'incomplete' | null
  due_date: string | null
  estimated_hours: number | null
  story_points: number | null
  task_code: string | null
  created_by: string
  created_at: string
  updated_at: string
  completed_at: string | null
  is_blocked: boolean
  regression_count: number
  assignees: TaskAssignee[]
  active_pics: TaskPicPhase[]
}

// TaskPicPhase (Phase 2, US-017 Phase PIC Handoff) -- satu baris per PIC
// per fase, immutable (riwayat lengkap, bukan diupdate di tempat).
export interface TaskPicPhase {
  id: string
  task_id: string
  status_id: string
  status_name: string
  user_id: string
  user_name: string
  user_email: string
  is_active: boolean
  acknowledged_at: string | null
  activated_at: string
  deactivated_at: string | null
  assigned_by: string | null
}

// TaskDependency (Phase 3, US-018 Finish-to-Start Hard-Block) -- satu
// entry predecessor ATAU successor (arah ditentukan endpoint yang
// memanggil, bukan field di sini).
export interface TaskDependency {
  task_id: string
  task_code: string | null
  title: string
  status: string
}

// TaskStatusSession (Phase 4, US-018b Status Time Tracking) -- satu sesi
// task di satu status; Queue/Active/Lead Time dihitung di klien dari
// timestamp mentah (bukan agregat backend terpisah).
export interface TaskStatusSession {
  id: string
  task_id: string
  status_id: string
  status_name: string
  session_no: number
  entered_at: string
  work_started_at: string | null
  is_auto_start: boolean
  exited_at: string | null
  is_regression: boolean
  triggered_by: string | null
}

export interface TaskFormValues {
  title: string
  description?: string
  priority: TaskPriority
  due_date: string
  estimated_hours: number | null
  story_points: number | null
  sprint_id: string | null
  assignee_ids: string[]
}

export const FIBONACCI_STORY_POINTS = [1, 2, 3, 5, 8, 13] as const
