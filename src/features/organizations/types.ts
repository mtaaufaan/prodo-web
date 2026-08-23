import { z } from 'zod'

export interface Organization {
  id: string
  group_id: string
  name: string
  slug: string
  deactivated_at: string | null
  created_at: string
}

export interface OrganizationSummary {
  member_count: number
  workspace_count: number
  storage_used_bytes: number
}

const slugSchema = z
  .string()
  .min(1, 'Slug wajib diisi')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase, alphanumeric, hyphen (mis. "acme-corp")')

// ponytail: group_id di sini adalah UUID mentah yang diketik manual --
// belum ada endpoint/UI direktori grup (group directory) di mana pun di
// aplikasi ini, jadi tidak ada cara lain bagi GA/PA memilihnya dari daftar.
// Ganti jadi dropdown begitu fitur group directory dibangun.
export const createOrganizationSchema = z.object({
  group_id: z.string().min(1, 'Group ID wajib diisi'),
  name: z.string().min(1, 'Nama wajib diisi'),
  slug: slugSchema,
})
export type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>

export const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  slug: slugSchema,
})
export type UpdateOrganizationFormValues = z.infer<typeof updateOrganizationSchema>
