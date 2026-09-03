import { z } from 'zod'

export interface Workspace {
  id: string
  org_id: string
  name: string
  archived_at: string | null
  deactivated_at: string | null
  created_at: string
}

// WorkspaceListRow -- GET /workspaces?group_id= (S4G-05, Track S4G, desain
// "GA Workspaces.dc.html") -- grid LINTAS organisasi dalam satu grup, org
// jadi kolom (bukan parameter route seperti Workspace/listWorkspaces di
// atas). admin_name/admin_email null kalau Admin Workspace-nya masih
// undangan PENDING (belum menerima). storage_used_bytes SELALU 0 untuk
// sekarang -- task_attachments (S4G-06) belum py jalur JOIN ke workspace
// sama sekali (tabel tasks belum ada), lihat implementation_gaps.md IG-19.
export interface WorkspaceListRow {
  id: string
  name: string
  archived_at: string | null
  deactivated_at: string | null
  created_at: string
  org_id: string
  org_name: string
  admin_name: string | null
  admin_email: string | null
  storage_used_bytes: number
  org_storage_quota_bytes: number
}

export interface CandidateAdmin {
  user_id: string
  email: string
  display_name: string
}

// createWorkspaceSchema -- S4G-05, Track S4G (desain "GA Add Workspace.dc.html"):
// admin_workspace_user_id (tab "MEMBER YANG ADA") DAN admin_email+admin_name
// (tab "UNDANG BARU") saling eksklusif -- form (CreateWorkspaceModal) yang
// menegakkan tab mana yang aktif, refine di sini cuma jaring pengaman
// terakhir persis satu jalur terisi.
export const createWorkspaceSchema = z
  .object({
    org_id: z.string().min(1, 'Organisasi induk wajib dipilih'),
    name: z.string().min(1, 'Nama wajib diisi'),
    admin_mode: z.enum(['existing', 'invite']),
    admin_workspace_user_id: z.string().optional(),
    admin_email: z.string().optional(),
    admin_name: z.string().optional(),
  })
  .refine((v) => v.admin_mode !== 'existing' || !!v.admin_workspace_user_id, {
    message: 'Pilih satu Admin Workspace penanggung jawab',
    path: ['admin_workspace_user_id'],
  })
  .refine((v) => v.admin_mode !== 'invite' || z.string().email().safeParse(v.admin_email).success, {
    message: 'Format email tidak valid',
    path: ['admin_email'],
  })
export type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  org_id: z.string().min(1, 'Organisasi induk wajib dipilih'),
})
export type UpdateWorkspaceFormValues = z.infer<typeof updateWorkspaceSchema>

export const reassignAdminSchema = z.object({
  admin_workspace_user_id: z.string().min(1, 'Pilih Admin Workspace pengganti'),
})
export type ReassignAdminFormValues = z.infer<typeof reassignAdminSchema>
