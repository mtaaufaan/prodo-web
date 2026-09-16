// S4-02/03/04, US-012.
export interface Project {
  id: string
  workspace_id: string
  name: string
  code: string
  pm_user_id: string | null
  pm_name: string
  pm_email: string
  is_archived: boolean
  member_count: number
  sprint_count: number
  task_count: number
  created_by_name: string
  created_by_email: string
  // pm_pending_email -- terisi kalau pm_user_id NULL DAN ada undangan
  // project_manager pending tertaut project ini ("menunggu PM", S4W
  // susulan, dikonfirmasi user 2026-09-13).
  pm_pending_email: string
  pm_pending_invitation_id: string
  created_at: string
  archived_at: string | null
  // status/end_date (susulan 2026-10-18, diminta user langsung "tambahkan
  // status project, dan tanggal berakhir project") -- AC awal US-012
  // (backlog.md: "tanggal mulai, tanggal selesai, dan status awal") tidak
  // pernah masuk desain final "AW Add Project.dc.html"/"AW Projects.dc.html"
  // -- gap yang baru ditutup sekarang. status TERPISAH dari is_archived
  // (arsip murni soal akses baca-saja, bukan siklus progres kerja).
  // Keduanya HANYA bisa diisi/diubah lewat Kelola Project.
  status: ProjectStatus
  end_date: string | null
  // mention_cooldown_minutes (S4W-07, US-033, "AW Cooldown
  // Mention.dc.html" kartu "OVERRIDE LEVEL PROJECT") -- NULL berarti
  // ikut nilai workspace. Belum ada UI untuk PM mengisinya (scope
  // terpisah), baca-saja di sini.
  mention_cooldown_minutes: number | null
}

export type ProjectStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold'

export const PROJECT_STATUSES: { key: ProjectStatus; label: string }[] = [
  { key: 'not_started', label: 'Belum Mulai' },
  { key: 'in_progress', label: 'Berjalan' },
  { key: 'completed', label: 'Selesai' },
  { key: 'on_hold', label: 'Ditunda' },
]

// PMTarget -- PERSIS SATU dari userId (member existing workspace ini) atau
// email+name (undang baru, name cuma wajib kalau email belum terdaftar --
// FE tidak tahu duluan, jadi selalu dikirim) dipakai Create/AssignPM.
export type PMTarget = { userId: string; email?: never; name?: never } | { userId?: never; email: string; name: string }
