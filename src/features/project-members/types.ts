import { z } from 'zod'

export interface ProjectMember {
  user_id: string
  email: string
  display_name: string
  role: string
  is_scoped: boolean
  added_at: string
  is_pm?: boolean
  // workspace_role (IG-97 susulan, "PM Member Project.dc.html" panel
  // Kelola) -- role member ini di workspace pemilik project (BEDA dari
  // `role` yang selalu project_scoped_role). null kalau project-scoped
  // murni tanpa keanggotaan workspace.
  workspace_role: string | null
}

export interface GroupAccount {
  user_id: string
  email: string
  display_name: string
  org_id: string
  org_name: string
}

// project_scoped_role (DATABASE_SCHEMA.md §5.13) -- HANYA 3 nilai, TIDAK
// termasuk admin_workspace/project_manager (role setinggi itu tidak
// relevan di-scope ke satu project saja).
export const PROJECT_SCOPED_ROLES: { key: string; label: string; description: string }[] = [
  { key: 'editor', label: 'EDITOR', description: 'Membuat dan mengedit task, komentar, dan lampiran.' },
  { key: 'approver', label: 'APPROVER', description: 'Menyetujui atau menolak entri waktu dan task tertentu.' },
  { key: 'viewer', label: 'VIEWER', description: 'Akses lihat saja, tidak dapat mengubah data.' },
]

export const addProjectMemberSchema = z.object({
  user_id: z.string().min(1, 'Pilih atau isi User ID'),
  role: z.enum(['editor', 'approver', 'viewer']),
})
export type AddProjectMemberFormValues = z.infer<typeof addProjectMemberSchema>
