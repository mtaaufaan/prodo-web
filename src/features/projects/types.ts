// ProjectPM -- satu PM aktif project (susulan multi-PM, dikonfirmasi user
// setelah menemukan "+ Tetapkan PM" ternyata mengganti PM yang ada --
// "bagaimana cara menambah PM dalam suatu project?"). Satu project boleh
// punya LEBIH dari satu PM sekarang.
export interface ProjectPM {
  user_id: string
  name: string
  email: string
}

// ProjectPendingPM -- satu undangan project_manager pending tertaut
// project ini. BOLEH lebih dari satu bersamaan (dikonfirmasi user).
export interface ProjectPendingPM {
  invitation_id: string
  email: string
}

// S4-02/03/04, US-012.
export interface Project {
  id: string
  workspace_id: string
  name: string
  code: string
  // project_managers/pending_pm_invitations (susulan multi-PM) --
  // menggantikan pm_user_id/pm_name/pm_email/pm_pending_email/
  // pm_pending_invitation_id tunggal.
  project_managers: ProjectPM[]
  pending_pm_invitations: ProjectPendingPM[]
  is_archived: boolean
  member_count: number
  sprint_count: number
  task_count: number
  created_by_name: string
  created_by_email: string
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

// isProjectPM (susulan multi-PM) -- helper bersama WorkspaceLayout.tsx dan
// PerformanceDashboardPage.tsx (dulu duplikat verbatim `p.pm_user_id ===
// currentUserId` di kedua file, keduanya sengaja disamakan logikanya --
// bug ditemukan lewat gap-check: co-PM yang bukan PM PERTAMA project itu
// tidak akan pernah cocok perbandingan tunggal, kehilangan nav/dashboard
// project-nya sendiri).
export function isProjectPM(project: Project, userId: string | undefined): boolean {
  return userId != null && project.project_managers.some((pm) => pm.user_id === userId)
}
