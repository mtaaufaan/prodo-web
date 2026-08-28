import { z } from 'zod'

// ServiceTier -- S4P-07, diperluas S4P-11: id jadi PK (bukan lagi name)
// supaya rename tier tidak memutus referensi groups.tier_id yang sudah
// ada. is_custom membedakan 3 tier standar (starter/business/enterprise,
// tidak bisa dihapus) dari tier yang ditambahkan PA sendiri.
// deactivated_at/archived_at -- 2 state independen dan reversible:
// nonaktif (tidak bisa di-assign ke GA baru, tetap tampil di daftar
// utama) vs archived (disembunyikan dari daftar utama, langkah menuju
// penghapusan permanen).
export interface ServiceTier {
  id: string
  name: string
  min_retention_days: number
  max_retention_days: number
  webhook_rate: number
  sso_enabled: boolean
  max_org: number
  max_storage_gb: number
  max_members: number
  is_custom: boolean
  deactivated_at: string | null
  archived_at: string | null
}

// serviceTierFormSchema -- dipakai form Tambah/Kelola Tier (S4P-11),
// aturan validasi sama persis dengan desain "PA Tier Editor" dan backend
// (service.validateServiceTierParams).
export const serviceTierFormSchema = z.object({
  name: z.string().min(1, 'Nama tier wajib diisi'),
  max_storage_gb: z.coerce.number().int().positive('Kuota global wajib diisi dan lebih besar dari 0 GB'),
  max_org: z.coerce.number().int().positive('Maks organisasi wajib diisi dan lebih besar dari 0'),
  max_members: z.coerce.number().int().positive('Maks member wajib diisi dan lebih besar dari 0'),
  min_retention_days: z.coerce.number().int().min(30, 'Retensi minimum tidak boleh di bawah 30 hari'),
  max_retention_days: z.coerce.number().int().max(3650, 'Retensi maksimum tidak boleh di atas 3.650 hari'),
  webhook_rate: z.coerce.number().int().positive('Rate webhook wajib diisi dan lebih besar dari 0 event/menit'),
  sso_enabled: z.boolean(),
}).refine((v) => v.max_retention_days >= v.min_retention_days, {
  message: 'Retensi maksimum harus lebih besar atau sama dengan retensi minimum',
  path: ['max_retention_days'],
})
export type ServiceTierFormValues = z.infer<typeof serviceTierFormSchema>

// GroupAdminStatus -- 3 state sesuai desain "PA Group Admin Form" (dropdown
// Status di mode Ubah): AKTIF, SUSPENDED, atau TIDAK AKTIF (pending, belum
// aktivasi -- cuma dicapai lewat onboarding, TIDAK bisa diset manual, lihat
// domain.ErrInvalidStatusTransition di backend).
export type GroupAdminStatus = 'AKTIF' | 'SUSPENDED' | 'TIDAK AKTIF'

// GroupAdmin -- satu baris daftar/detail Group Admin (S1-12, diperluas
// S4P-06 sesuai desain "PA Group Admins"). Field grup (group_name, tier,
// dst.) nullable -- GA lama dari sebelum IG-21 mungkin belum punya grup
// sama sekali. tier_id sejak S4P-11 -- dipakai form Ubah untuk assign
// tier (bukan tier/nama, yang cuma untuk tampilan).
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
  tier_id: string | null
  tier: string | null
  storage_quota_gb: number | null
  tier_max_org: number
  tier_max_storage_gb: number
  tier_max_members: number
  used_org_count: number
  used_storage_mb: number
  used_member_count: number
}

// groupAdminFormSchema -- dipakai bersama Tambah dan Ubah (email cuma
// wajib/bisa diisi saat Tambah, lihat createGroupAdminSchema/
// updateGroupAdminSchema di bawah). Jabatan PIC/Alamat/No. Telepon
// opsional, sesuai desain "PA Group Admin Form". tier_id sejak S4P-11 --
// pilihan dari daftar tier assignable yang dimuat live, bukan enum tetap.
const groupAdminFormSchema = z.object({
  display_name: z.string().min(1, 'Nama wajib diisi'),
  group_name: z.string().min(1, 'Nama perusahaan/grup wajib diisi'),
  job_title: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  tier_id: z.string().min(1, 'Tier wajib dipilih'),
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

// PlatformAuditLogEntry -- satu baris GET /platform/audit-logs (S4P-22,
// US-071). actor_* nullable -- beberapa aksi lama (sebelum kolom ini
// dipakai) atau aksi sistem bisa tidak punya actor. metadata bentuknya
// bebas tergantung action (mis. { email, group_id } untuk user.invited).
export interface PlatformAuditLogEntry {
  id: string
  actor_id: string | null
  actor_email: string | null
  actor_display_name: string | null
  actor_role: string | null
  action: string
  entity_type: string
  entity_id: string | null
  target_user_name: string | null
  target_tier_name: string | null
  metadata: Record<string, unknown> | null
  logged_at: string
}

// PlatformAuditLogFilter -- field kosong berarti tidak difilter (dikirim
// sebagai query param cuma kalau terisi, lihat api.ts listAuditLogs).
export interface PlatformAuditLogFilter {
  action_type?: string
  actor_id?: string
  from?: string
  to?: string
}

// PlatformHealthMetrics -- GET /platform/health-metrics (S4P-24, US-072).
export interface PlatformHealthMetrics {
  active_ga_count: number
  active_org_count: number
  total_storage_used_bytes: number
  tier_distribution: Record<string, number>
}

// PlatformTrendPoint -- satu titik GET /platform/trends (S4P-25).
export interface PlatformTrendPoint {
  date: string
  new_ga_count: number
  new_org_count: number
}

// PlatformStorageAnomaly/PlatformContractEndingAnomaly -- GET
// /platform/anomalies (S4P-26).
export interface PlatformStorageAnomaly {
  group_id: string
  group_name: string
  used_mb: number
  quota_gb: number
}

export interface PlatformContractEndingAnomaly {
  org_id: string
  org_name: string
  group_name: string
  contract_end_at: string
}

export interface PlatformAnomalies {
  storage: PlatformStorageAnomaly[]
  contract_end: PlatformContractEndingAnomaly[]
}
