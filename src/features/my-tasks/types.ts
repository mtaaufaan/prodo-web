import type { TaskPriority } from '@/features/tasks/types'

// Task Saya (S6E-03, Sprint 6 "Editor Console", desain "TM Task Saya.dc.html").
// Kontrak GET /me/tasks?project_id= -- backend menyusul di S6E-04; sampai itu
// dilayani mock MSW. Satu respons memuat semua baris project aktif; tab
// Ditugaskan/Diikuti dan kartu statistik dihitung di klien (myTaskStats.ts).
export interface MyTaskNextStatus {
  id: string
  name: string
  require_pic: boolean
}

export interface MyTask {
  task_id: string
  task_code: string
  title: string
  project_id: string
  status_id: string
  status_name: string
  status_color: string | null
  priority: TaskPriority
  sprint_name: string | null
  due_date: string | null
  pic_names: string[]
  comment_count: number
  sub_total: number
  sub_done: number
  logged_hours: number
  estimate_hours: number
  // is_mine -- assignee ATAU PIC aktif; is_followed -- otomatis saat berkomentar/di-mention/ditugaskan.
  is_mine: boolean
  is_followed: boolean
  is_late: boolean
  // null bila tidak ada status berikutnya atau status berikutnya UNDEFINED.
  next_status: MyTaskNextStatus | null
}

export const COMMENT_MAX = 1000
