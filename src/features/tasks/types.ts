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
  // require_pic -- wajib menetapkan PIC saat task masuk status ini; DONE/CANCELED default false.
  require_pic: boolean
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
  // kode unik per project (SPR-01, ...) -- kunci penghubung import task (IG-120)
  code: string
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
  start_date: string | null
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
  // Hanya ada di respons DETAIL task (GET /tasks/:id), TIDAK di daftar task.
  logged_minutes?: number
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

// TaskDependencyEdge (menu Board tab Gantt, panah dependency -- US-039/
// S7-13) -- SATU edge dependency dengan KEDUA sisinya sekaligus (beda dari
// TaskDependency di atas yang satu sisi/task, dipakai tab Dependency Task
// Detail). Diambil sekali per project (`GET /projects/:id/dependencies`),
// dipakai gambar SEMUA panah Gantt tanpa fetch per-task.
export interface TaskDependencyEdge {
  predecessor_id: string
  predecessor_code: string | null
  predecessor_title: string
  predecessor_status: string
  successor_id: string
  successor_code: string | null
  successor_title: string
  successor_status: string
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
  start_date: string
  due_date: string
  estimated_hours: number | null
  story_points: number | null
  sprint_id: string | null
  assignee_ids: string[]
}

export const FIBONACCI_STORY_POINTS = [1, 2, 3, 5, 8, 13] as const

// HOURS_PER_DAY -- start_date/due_date cuma DATE (tanpa komponen jam),
// estimasi (jam) dikonversi kelipatan 24, dibulatkan ke hari terdekat.
const HOURS_PER_DAY = 24

// parseDateOnly/formatDateOnly -- pakai UTC murni (bukan Date biasa, yang
// menafsirkan "YYYY-MM-DD" di local time lalu bisa mundur/maju satu hari
// saat diformat balik via toISOString di timezone non-UTC) supaya aritmetika
// tanggal (tambah/kurang hari) tidak pernah drift akibat timezone browser.
function parseDateOnly(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  // y < 1000: tahun masih setengah diketik di <input type="date"> (onChange
  // menembak tiap digit: 0002, 0020, 0202, 2026). Date.UTC juga memetakan
  // tahun 0-99 ke 1900-an -- tolak keduanya supaya auto-fill menunggu 4 digit.
  if (!y || y < 1000 || !m || !d) return null
  const date = new Date(Date.UTC(y, m - 1, d))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// TaskDateFields -- 3 field AddTaskModal/TaskDetailModal yang saling
// mengisi (diminta user): start_date (perkiraan mulai), due_date
// (perkiraan selesai), estimated_hours (jam, string mentah dari input).
export interface TaskDateFields {
  start_date: string
  due_date: string
  estimated_hours: string
}

// autoFillTaskDates -- 3 field saling terikat: isi 2 dari 3 -> yang ketiga
// otomatis dihitung (start+estimasi->due, due+estimasi->start, start+due->
// estimasi). Tanpa `changed` hanya mengisi field yang KOSONG. Dengan `changed`
// (field yang baru diedit user) ketiganya tetap sinkron saat semuanya sudah
// terisi: ubah tanggal -> estimasi dihitung ulang (tanggal tetap seperti yang
// diketik); ubah estimasi -> due_date digeser dari start_date (atau start_date
// dari due_date kalau start kosong).
export function autoFillTaskDates(fields: TaskDateFields, changed?: keyof TaskDateFields): Partial<TaskDateFields> {
  const { start_date, due_date, estimated_hours } = fields
  const start = parseDateOnly(start_date)
  const due = parseDateOnly(due_date)
  const hours = estimated_hours ? parseFloat(estimated_hours) : null

  if ((changed === 'start_date' || changed === 'due_date') && start && due) {
    const days = Math.round((due.getTime() - start.getTime()) / 86400000)
    return { estimated_hours: String(Math.max(days, 0) * HOURS_PER_DAY) }
  }
  if (changed === 'estimated_hours') {
    // Dikosongkan user (mau ketik ulang) -- jangan langsung diisi balik.
    if (hours == null || Number.isNaN(hours) || hours < 0) return {}
    const offset = Math.round(hours / HOURS_PER_DAY)
    if (start) {
      const result = new Date(start)
      result.setUTCDate(result.getUTCDate() + offset)
      return { due_date: formatDateOnly(result) }
    }
    if (due) {
      const result = new Date(due)
      result.setUTCDate(result.getUTCDate() - offset)
      return { start_date: formatDateOnly(result) }
    }
    return {}
  }

  if (!due_date && start && hours != null && hours >= 0) {
    const result = new Date(start)
    result.setUTCDate(result.getUTCDate() + Math.round(hours / HOURS_PER_DAY))
    return { due_date: formatDateOnly(result) }
  }
  if (!start_date && due && hours != null && hours >= 0) {
    const result = new Date(due)
    result.setUTCDate(result.getUTCDate() - Math.round(hours / HOURS_PER_DAY))
    return { start_date: formatDateOnly(result) }
  }
  if (!estimated_hours && start && due) {
    const days = Math.round((due.getTime() - start.getTime()) / 86400000)
    return { estimated_hours: String(Math.max(days, 0) * HOURS_PER_DAY) }
  }
  return {}
}

// TaskChecklistItem (SUB-TASK, "PM Task Detail.dc.html", IG-97 susulan).
export interface TaskChecklistItem {
  id: string
  task_id: string
  title: string
  is_done: boolean
  position: number
}
