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

  // Kontrak aktif grup (dikonfirmasi user 2026-08-29): null kalau grup
  // belum pernah punya kontrak sama sekali.
  contract_start_at: string | null
  subscription_period: SubscriptionPeriod | null
  contract_end_at: string | null
  invoice_number: string | null
}

export type SubscriptionPeriod = 'monthly' | 'quarterly' | 'yearly'

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

// subscriptionPeriodSchema -- kontrak grup (dikonfirmasi user 2026-08-29):
// monthly/quarterly/yearly, sama persis dengan enum backend
// (domain.ErrInvalidSubscriptionPeriod).
const subscriptionPeriodSchema = z.enum(['monthly', 'quarterly', 'yearly'])

export const createGroupAdminSchema = groupAdminFormSchema
  .extend({
    email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
    // Kontrak awal OPSIONAL saat Tambah -- kosong berarti grup dibuat
    // tanpa kontrak dulu, bisa ditambah belakangan lewat "Perpanjang
    // Kontrak". Kalau contract_start_at diisi, subscription_period wajib.
    contract_start_at: z.string().optional(),
    contract_subscription_period: z.union([subscriptionPeriodSchema, z.literal('')]).optional(),
    contract_invoice_number: z.string().optional(),
  })
  .refine((v) => !v.contract_start_at || !!v.contract_subscription_period, {
    message: 'Masa langganan wajib dipilih kalau tanggal mulai kontrak diisi',
    path: ['contract_subscription_period'],
  })
export type CreateGroupAdminFormValues = z.infer<typeof createGroupAdminSchema>

// renewGroupContractSchema -- form "Perpanjang Kontrak" (dikonfirmasi
// user 2026-08-29), dipakai baik untuk kontrak pertama grup maupun
// perpanjangan -- ketiganya wajib (beda dari saat Tambah GA yang
// opsional).
export const renewGroupContractSchema = z.object({
  start_at: z.string().min(1, 'Tanggal mulai wajib diisi'),
  subscription_period: subscriptionPeriodSchema,
  invoice_number: z.string().optional(),
})
export type RenewGroupContractFormValues = z.infer<typeof renewGroupContractSchema>

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
  // target_user_role -- S4P-40: action code seperti user.suspended/
  // user.invited/user.reactivated/user.mfa_reset dipakai bersama untuk
  // Group Admin dan Platform Admin -- field ini membedakan target-nya
  // supaya kalimat naratif benar (lihat auditNarrative.ts).
  target_user_role: string | null
  target_tier_name: string | null
  // actor_ip -- 2026-08-29, permintaan user: audit trail perlu info asal
  // request. NULL untuk entry lama sebelum kolom ini dipopulasikan.
  // metadata.request_path (format "METHOD /path") disuntikkan bersamaan.
  actor_ip: string | null
  // state_before/state_after -- 2026-08-29, permintaan user: perubahan
  // satu nilai skalar (session timeout, IP allowlist enabled, status
  // tier) perlu menyertakan nilai sebelum-sesudah. null untuk action yang
  // tidak relevan (perubahan multi-field diwakilkan nama/kode unik di
  // metadata, bukan diff per-field).
  state_before: Record<string, unknown> | null
  state_after: Record<string, unknown> | null
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
  severity: 'warning' | 'critical'
}

// PlatformContractEndingAnomaly -- dibalik jadi per-GRUP 2026-08-29
// (dikonfirmasi user): kontrak adalah hubungan komersial Platform Admin
// <-> Group Admin, bukan properti organisasi.
export interface PlatformContractEndingAnomaly {
  group_id: string
  group_name: string
  contract_end_at: string
}

export interface PlatformAnomalies {
  storage: PlatformStorageAnomaly[]
  contract_end: PlatformContractEndingAnomaly[]
}

// PlatformAdminAccount -- satu baris GET /platform/admins (S4P-40,
// US-084).
export interface PlatformAdminAccount {
  id: string
  email: string
  display_name: string
  is_active: boolean
  suspended_at: string | null
  last_login_at: string | null
  created_at: string
}

// createPlatformAdminSchema -- S4P-37/40. Tidak ada grup/tier/kuota
// seperti Group Admin -- Platform Admin cuma email + display_name.
export const createPlatformAdminSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  display_name: z.string().min(1, 'Nama wajib diisi'),
})
export type CreatePlatformAdminFormValues = z.infer<typeof createPlatformAdminSchema>

// GroupDirectoryEntry -- GET /platform/groups (S4P-34, US-083). Platform
// Admin melihat semua grup; Group Admin cuma grup yang dia kelola sendiri.
// min_retention_days/max_retention_days (S4G-34, Track S4G) -- plafon
// retensi TIER grup ini (service_tiers.min/max_retention_days, di-clamp
// [30,365] backend) -- dipakai hint "RANGE {min}-{max} (BATAS TIER
// {nama})" di form Buat/Kelola Organisasi, desain "GA Add Organization.dc.html".
export interface GroupDirectoryEntry {
  id: string
  name: string
  tier: string
  ga_names: string
  org_count: number
  min_retention_days: number
  max_retention_days: number
}

// ErasureRequestStatus/ErasureRequestEntry -- GET /platform/erasure-requests
// (S4P-30, US-060). status DONE/REJECTED punya processed_at, PENDING null.
export type ErasureRequestStatus = 'PENDING' | 'DONE' | 'REJECTED'

export interface ErasureRequestEntry {
  id: string
  subject: string
  org: string
  requested_by: string
  status: ErasureRequestStatus
  requested_at: string
  processed_at: string | null
}
