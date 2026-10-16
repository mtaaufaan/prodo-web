import type { Capabilities } from '@/features/context/types'
import type { Task } from '@/features/tasks/types'

// Mode Board per role (S6E-05, Sprint 6 "Editor Console"; props readOnly/limitToMine di
// "PM Board.dc.html"). Satu komponen Board dipakai semua role; kemampuan menentukan apa yang aktif.
export interface BoardMode {
  // limitToMine -- Editor: semua task terlihat, tapi hanya task miliknya yang bisa diubah.
  limitToMine: boolean
  // readOnly -- tidak ada aksi ubah sama sekali (Approver/Viewer).
  readOnly: boolean
  // bulk -- pilih banyak task + aksi massal (PM/Admin Workspace).
  bulk: boolean
}

export const FULL_BOARD_MODE: BoardMode = { limitToMine: false, readOnly: false, bulk: true }

// boardModeFor -- dari `capabilities` /me/context (S6E-02). Belum termuat/tidak diketahui -> mode penuh
// (perilaku Board sebelum S6E-05); penegak sebenarnya tetap backend.
export function boardModeFor(caps: Capabilities | undefined): BoardMode {
  if (!caps || caps.manage_project) return FULL_BOARD_MODE
  if (caps.edit_own_task) return { limitToMine: true, readOnly: false, bulk: false }
  return { limitToMine: false, readOnly: true, bulk: false }
}

// isOwnTask -- task "milik saya" = assignee ATAU PIC aktif (sama dengan Task Saya, S6E-04).
export function isOwnTask(task: Task, userId: string | undefined): boolean {
  if (!userId) return false
  return task.assignees.some((a) => a.user_id === userId) || task.active_pics.some((p) => p.user_id === userId && p.is_active)
}

// canActOn -- boleh menggeser/memindah/menandai task ini.
export function canActOn(mode: BoardMode, task: Task, userId: string | undefined): boolean {
  if (mode.readOnly) return false
  return !mode.limitToMine || isOwnTask(task, userId)
}

// canToggleComplete -- aturan backend (NOT_BACKLOG_PIC): hanya PIC aktif task BACKLOG.
export function canToggleComplete(mode: BoardMode, task: Task, userId: string | undefined): boolean {
  if (mode.readOnly || task.status_name !== 'BACKLOG' || !userId) return false
  return task.active_pics.some((p) => p.user_id === userId && p.is_active)
}

export type DueBucket = 'Terlambat' | 'Tanpa tanggal' | '7 hari' | '> 7 hari'

const DAY_MS = 86_400_000

// dueBucket -- saringan DUE DATE Daftar (desain): lewat due & belum selesai = Terlambat; sisanya
// berdasarkan selisih hari terhadap `today` (YYYY-MM-DD, UTC).
export function dueBucket(task: Task, today: string): DueBucket {
  if (!task.due_date) return 'Tanpa tanggal'
  const done = task.status_name === 'DONE' || task.status_name === 'CANCELED'
  if (task.due_date < today && !done) return 'Terlambat'
  const days = Math.floor((Date.parse(task.due_date) - Date.parse(today)) / DAY_MS)
  return days <= 7 ? '7 hari' : '> 7 hari'
}

export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}
