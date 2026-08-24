import { z } from 'zod'

export interface GroupAdmin {
  id: string
  email: string
  display_name: string
  status: 'active' | 'pending'
  created_at: string
}

// group_name -- IG-21: setiap GA baru wajib langsung mengelola satu grup
// baru, sesuai desain modal "Tambah Group Admin" (field "Nama Perusahaan
// / Grup"). Field desain lain (Jabatan PIC, Alamat, No. Telepon, Tier)
// menyusul S4P-06.
export const createGroupAdminSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  display_name: z.string().min(1, 'Nama wajib diisi'),
  group_name: z.string().min(1, 'Nama perusahaan/grup wajib diisi'),
})

export type CreateGroupAdminFormValues = z.infer<typeof createGroupAdminSchema>
