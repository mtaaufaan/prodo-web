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
  // task_count (S4W-05, US-021) -- jumlah task yang sedang memakai status
  // ini, ditampilkan di panel Kelola sebelum AW menjadikannya UNDEFINED.
  task_count: number
}

// CUSTOM_STATUS_COLORS (S4W-05, "AW Add Status.dc.html" WARNA PENANDA) -- 7
// token warna resmi Tailwind (tailwind.config.ts, docs/design.md §2),
// dipetakan ke kelas utility supaya konsisten dengan warna lain di
// codebase ini (bukan literal oklch seperti prototype Claude Design).
// 'accent' -- token lama dari seed 5 status sistem (IN PROGRESS) yang
// TIDAK ADA di 7 token resmi -- di-alias ke 'signal' di sini supaya tetap
// tampil benar, pilihan warna BARU selalu simpan salah satu dari 7 ini.
export type CustomStatusColorToken = 'grey' | 'signal' | 'violet' | 'amber' | 'red' | 'blue' | 'mint'

export const CUSTOM_STATUS_COLORS: { key: CustomStatusColorToken; label: string }[] = [
  { key: 'grey', label: 'ABU-ABU' },
  { key: 'signal', label: 'ORANYE' },
  { key: 'violet', label: 'UNGU' },
  { key: 'amber', label: 'KUNING' },
  { key: 'red', label: 'MERAH' },
  { key: 'blue', label: 'BIRU' },
  { key: 'mint', label: 'HIJAU' },
]

export function normalizeStatusColor(token: string | null): CustomStatusColorToken {
  if (token === 'accent') return 'signal'
  return (CUSTOM_STATUS_COLORS.some((c) => c.key === token) ? token : 'grey') as CustomStatusColorToken
}

// statusColorClasses -- kelas Tailwind literal per token (BUKAN interpolasi
// `text-${token}`, purge JIT tidak mengenali itu). dot dipakai kolom
// STATUS (kotak warna), text+border dipakai badge JENIS/chip.
const STATUS_COLOR_CLASSES: Record<CustomStatusColorToken, { dot: string; text: string; border: string }> = {
  grey: { dot: 'bg-grey', text: 'text-grey', border: 'border-grey' },
  signal: { dot: 'bg-signal', text: 'text-signal', border: 'border-signal' },
  violet: { dot: 'bg-violet', text: 'text-violet', border: 'border-violet' },
  amber: { dot: 'bg-amber', text: 'text-amber', border: 'border-amber' },
  red: { dot: 'bg-red', text: 'text-red', border: 'border-red' },
  blue: { dot: 'bg-blue', text: 'text-blue', border: 'border-blue' },
  mint: { dot: 'bg-mint', text: 'text-mint', border: 'border-mint' },
}

export function statusColorClasses(token: string | null) {
  return STATUS_COLOR_CLASSES[normalizeStatusColor(token)]
}

// SprintStatus 3-state (IG-92) -- MENGGANTIKAN `is_active` boolean lama
// (IG-46) yang tidak bisa membedakan "belum pernah dimulai" dari "sudah
// selesai" (keduanya is_active=false).
export type SprintStatus = 'backlog' | 'active' | 'done'

export interface Sprint {
  id: string
  project_id: string
  name: string
  start_date: string | null
  end_date: string | null
  goal: string | null
  status: SprintStatus
  created_at: string
}

export interface SprintSummary {
  total_story_points: number
  done_story_points: number
  left_story_points: number
  unestimated_count: number
  task_count: number
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
  position: number
  assignees: TaskAssignee[]
  active_pics: TaskPicPhase[]
  logged_minutes: number
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

// TaskVersionSnapshot (IG-97, tab RIWAYAT VERSI) -- snapshot judul+deskripsi
// SEBELUM tiap perubahan tersimpan, terurut terbaru dulu. `trigger` field
// tambahan (di luar DATABASE_SCHEMA.md §5.19 asli) -- alasan singkat versi
// ini dibuat.
export interface TaskVersionSnapshot {
  id: string
  task_id: string
  title: string
  description: unknown
  changed_by: string | null
  changed_by_name: string
  changed_by_email: string
  trigger: string
  snapshot_at: string
}

// TaskActivityEntry (IG-94/IG-97, tab AKTIVITAS) -- satu baris audit_logs
// (entity_type='task' ATAU 'task_attachment' milik task ini).
export interface TaskActivityEntry {
  id: string
  action: string
  actor_id: string | null
  actor_name: string
  actor_email: string
  actor_role: string
  state_before: Record<string, unknown> | null
  state_after: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  logged_at: string
}

// TimeEntry/ActiveTimer (Timesheet, IG-97/US-036/037).
export interface TimeEntry {
  id: string
  task_id: string
  user: { user_id: string; display_name: string; email: string }
  entry_type: 'timer' | 'manual'
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  note: string | null
  approval_status: 'pending' | 'approved' | 'rejected'
  rejection_note: string | null
  created_at: string
  updated_at: string
}

export interface ActiveTimer {
  timer_id: string
  task_id: string
  started_at: string
  elapsed_seconds: number
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

// TaskChecklistItem (SUB-TASK, "PM Task Detail.dc.html", IG-97 susulan).
export interface TaskChecklistItem {
  id: string
  task_id: string
  title: string
  is_done: boolean
  position: number
}
