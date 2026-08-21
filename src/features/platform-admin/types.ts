import { z } from 'zod'

export interface GroupAdmin {
  id: string
  email: string
  display_name: string
  status: 'active' | 'pending'
  created_at: string
}

export const createGroupAdminSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  display_name: z.string().min(1, 'Nama wajib diisi'),
})

export type CreateGroupAdminFormValues = z.infer<typeof createGroupAdminSchema>
