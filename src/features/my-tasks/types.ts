import type { TaskPriority } from '@/features/tasks/types'

// Task Saya (Sprint 6 "Editor Console", desain "TM Task Saya.dc.html"). Kontrak GET /me/tasks
// (S6E-04, API_CONTRACT v1.82.0): satu halaman baris + total + statistik 4 kartu dari server.
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
  // is_mine -- assignee ATAU PIC aktif; is_followed -- follower (otomatis saat berkomentar/di-mention/ditugaskan).
  is_mine: boolean
  is_followed: boolean
  is_late: boolean
  // null bila tidak ada status berikutnya atau status berikutnya UNDEFINED.
  next_status: MyTaskNextStatus | null
}

export type MyTaskView = 'assigned' | 'following'

// Kartu dihitung dari task "saya" (Ditugaskan) di project aktif, apa pun tab yang dibuka.
export interface MyTaskStats {
  total: number
  running: number
  logged_hours: number
  late: number
}

export interface MyTasksPage {
  items: MyTask[]
  total: number
  page: number
  per_page: number
  stats: MyTaskStats
}

// Respons POST /tasks/:id/comments. mentions = nama yang berhasil di-resolusi server; notified =
// berapa yang akan diberi notifikasi (langsung atau lewat ringkasan; yang ditekan cooldown tidak dihitung).
export interface PostCommentResult {
  comment_count: number
  mentions: string[]
  notified: number
}

export const COMMENT_MAX = 1000
