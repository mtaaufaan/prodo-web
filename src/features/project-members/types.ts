import { z } from 'zod'

export interface ProjectMember {
  user_id: string
  email: string
  display_name: string
  role: string
  is_scoped: boolean
  added_at: string
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
export const PROJECT_SCOPED_ROLES: { key: string; label: string }[] = [
  { key: 'editor', label: 'EDITOR' },
  { key: 'approver', label: 'APPROVER' },
  { key: 'viewer', label: 'VIEWER' },
]

export const addProjectMemberSchema = z.object({
  user_id: z.string().min(1, 'Pilih atau isi User ID'),
  role: z.enum(['editor', 'approver', 'viewer']),
})
export type AddProjectMemberFormValues = z.infer<typeof addProjectMemberSchema>
