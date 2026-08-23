import { z } from 'zod'

export interface Workspace {
  id: string
  org_id: string
  name: string
  archived_at: string | null
  created_at: string
}

// ponytail: admin_workspace_user_id di sini adalah UUID mentah yang diketik
// manual -- sama alasan group_id di features/organizations/types.ts: belum
// ada endpoint "cari member organisasi" lintas-workspace untuk dijadikan
// picker (GA Add Workspace.dc.html full design punya picker + mode undang
// email baru, keduanya di luar scope backend saat ini).
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  admin_workspace_user_id: z.string().min(1, 'Admin Workspace User ID wajib diisi'),
})
export type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
})
export type UpdateWorkspaceFormValues = z.infer<typeof updateWorkspaceSchema>
