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
}

// PMTarget -- PERSIS SATU dari userId (member existing workspace ini) atau
// email+name (undang baru, name cuma wajib kalau email belum terdaftar --
// FE tidak tahu duluan, jadi selalu dikirim) dipakai Create/AssignPM.
export type PMTarget = { userId: string; email?: never; name?: never } | { userId?: never; email: string; name: string }
