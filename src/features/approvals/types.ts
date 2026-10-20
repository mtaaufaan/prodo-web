import type { TaskPriority } from '@/features/tasks/types'

// Antrean Approval (Sprint 7 "Approver Console", desain "TM Antrean Approval.dc.html" + "TM Konfirmasi
// Approval.dc.html"). KONTRAK USULAN untuk S7A-04 (IG-149) -- sampai backend ada dilayani mock MSW:
//   GET  /me/approvals?project_id=&view=pending|decided&page=&per_page=
//   POST /tasks/:id/approval  { decision: 'approve' | 'reject', note }
export type ApprovalView = 'pending' | 'decided'
export type ApprovalDecision = 'approve' | 'reject'

export interface ApprovalItem {
  // approval_id -- id keputusan (null pada antrean pending); riwayat memuat SATU baris per keputusan, jadi task yang
  // ditolak lalu disetujui kemudian muncul dua kali -- kunci unik baris = approval_id ?? task_id.
  approval_id: string | null
  task_id: string
  task_code: string
  title: string
  project_id: string
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
  // Keputusan saya atas task ini (null = belum diputuskan); disimpan permanen, bukan hanya sesi (IG-149).
  decision: 'approved' | 'rejected' | null
  decided_at: string | null
  decision_note: string | null
}

// Kartu: pending/decided milik saya di project; total_tasks dan late menghitung SEMUA task project (desain).
export interface ApprovalStats {
  pending: number
  decided: number
  total_tasks: number
  late: number
}

export interface ApprovalsPage {
  items: ApprovalItem[]
  total: number
  page: number
  per_page: number
  stats: ApprovalStats
}

export interface DecisionResult {
  task_id: string
  task_code: string
  status_name: string
  decision: 'approved' | 'rejected'
}

export const NOTE_MAX = 1000
export const REJECT_NOTE_MIN = 5
