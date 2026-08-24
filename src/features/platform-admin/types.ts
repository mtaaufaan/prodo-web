import { z } from 'zod'

// S4P-07: nilai harus sama persis dengan migrations/..._service_tiers.up.sql
// (CHECK constraint) -- 'business', BUKAN 'professional' (koreksi wording,
// lihat commit S4P-06/07).
export const SERVICE_TIERS = ['starter', 'business', 'enterprise'] as const
export type ServiceTierName = (typeof SERVICE_TIERS)[number]

export interface ServiceTier {
  name: ServiceTierName
  min_retention_days: number
  max_retention_days: number
  webhook_rate: number
  sso_enabled: boolean
  max_org: number
  max_storage_gb: number
  max_members: number
}

// GroupAdminStatus -- 3 state sesuai desain "PA Group Admin Form" (dropdown
// Status di mode Ubah): AKTIF, SUSPENDED, atau TIDAK AKTIF (pending, belum
// aktivasi -- cuma dicapai lewat onboarding, TIDAK bisa diset manual, lihat
// domain.ErrInvalidStatusTransition di backend).
export type GroupAdminStatus = 'AKTIF' | 'SUSPENDED' | 'TIDAK AKTIF'

// GroupAdmin -- satu baris daftar/detail Group Admin (S1-12, diperluas
// S4P-06 sesuai desain "PA Group Admins"). Field grup (group_name, tier,
// dst.) nullable -- GA lama dari sebelum IG-21 mungkin belum punya grup
// sama sekali.
export interface GroupAdmin {
  id: string
  email: string
  display_name: string
  status: GroupAdminStatus
  created_at: string
  group_id: string | null
  group_name: string | null
  job_title: string | null
  address: string | null
  phone: string | null
  tier: ServiceTierName | null
  storage_quota_gb: number | null
  tier_max_org: number
  tier_max_storage_gb: number
  tier_max_members: number
  used_org_count: number
  used_storage_mb: number
  used_member_count: number
}

const tierEnum = z.enum(SERVICE_TIERS, { errorMap: () => ({ message: 'Tier wajib dipilih' }) })

// groupAdminFormSchema -- dipakai bersama Tambah dan Ubah (email cuma
// wajib/bisa diisi saat Tambah, lihat createGroupAdminSchema/
// updateGroupAdminSchema di bawah). Jabatan PIC/Alamat/No. Telepon
// opsional, sesuai desain "PA Group Admin Form".
const groupAdminFormSchema = z.object({
  display_name: z.string().min(1, 'Nama wajib diisi'),
  group_name: z.string().min(1, 'Nama perusahaan/grup wajib diisi'),
  job_title: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  tier: tierEnum,
  storage_quota_gb: z.coerce.number().int().positive('Plafon storage wajib lebih besar dari 0 GB'),
})

export const createGroupAdminSchema = groupAdminFormSchema.extend({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
})
export type CreateGroupAdminFormValues = z.infer<typeof createGroupAdminSchema>

// updateGroupAdminSchema -- TANPA email (sengaja read-only saat Ubah,
// mengubah identitas Keycloak di luar scope task ini). status opsional --
// "" berarti tidak diubah.
export const updateGroupAdminSchema = groupAdminFormSchema.extend({
  status: z.enum(['AKTIF', 'SUSPENDED', '']).optional(),
})
export type UpdateGroupAdminFormValues = z.infer<typeof updateGroupAdminSchema>
