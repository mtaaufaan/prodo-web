import { z } from 'zod'

export interface Organization {
  id: string
  group_id: string
  name: string
  slug: string
  domain: string
  default_language: string
  storage_quota_bytes: number
  storage_max_bytes: number
  storage_used_bytes: number
  retention_days: number
  workspace_count: number
  member_count: number
  deactivated_at: string | null
  created_at: string
}

// S4G-03, Track S4G: GET /organizations sekarang mengembalikan objek
// {organizations, group_storage_ceiling_bytes} (bukan array polos) --
// group_storage_ceiling_bytes 0 kalau daftar kosong/lintas grup (Platform
// Admin), lihat komentar OrganizationRepository.List di backend.
export interface OrganizationListResult {
  organizations: Organization[]
  group_storage_ceiling_bytes: number
}

const slugSchema = z
  .string()
  .min(1, 'Slug wajib diisi')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase, alphanumeric, hyphen (mis. "acme-corp")')

// domain (S4G-02, Track S4G): sama regex dengan CHECK constraint DB --
// kosong diizinkan (opsional, dikosongkan di server sebagai NULL).
const domainSchema = z
  .string()
  .refine((v) => v === '' || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(v), 'Format domain tidak valid (mis. acme.co.id)')

// group_id dipilih dari dropdown direktori grup (S4P-36, menutup
// implementation_gaps.md IG-16). S4G-05 (Track S4G, desain
// "GA Add Organization.dc.html"): domain/default_language/quota_gb/
// retention_days ditambahkan supaya organisasi dibuat lengkap dalam satu
// submit (sebelumnya cuma name/slug/group_id, sisanya harus diisi lewat
// ManageOrganizationModal setelah dibuat). `slug` tidak lagi diisi manual
// di form -- diturunkan otomatis dari `name` (lihat CreateOrganizationModal),
// tetap ada di schema karena tetap dikirim ke API persis format S3-02.
export const createOrganizationSchema = z.object({
  group_id: z.string().min(1, 'Group ID wajib diisi'),
  name: z.string().min(1, 'Nama wajib diisi'),
  slug: slugSchema,
  domain: domainSchema,
  default_language: z.enum(['id', 'en']),
  quota_gb: z.coerce.number().min(0.1, 'Kuota minimal 0.1 GB'),
  retention_days: z.coerce
    .number()
    .int('Retensi harus bilangan bulat')
    .min(30, 'Retensi minimal 30 hari')
    .max(365, 'Retensi maksimal 365 hari'),
})
export type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>

export const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  slug: slugSchema,
  domain: domainSchema,
})
export type UpdateOrganizationFormValues = z.infer<typeof updateOrganizationSchema>

// S3-29/30/31 (US-010).
export const updateSettingsSchema = z.object({
  default_language: z.enum(['id', 'en']),
})
export type UpdateSettingsFormValues = z.infer<typeof updateSettingsSchema>

// S3-32/34/36 (US-011), retention_days ditambah S4G-03 (Track S4G, desain
// "GA Organizations.dc.html" -- kuota+retensi digabung satu section/satu
// simpan) -- quota_gb dalam GB (lebih ramah dibaca), dikonversi ke bytes
// sebelum dikirim ke API. Batas retensi 30-365 hari sama persis CHECK
// constraint DB (organizations.retention_days) -- valid dipakai sebagai
// bound tanpa perlu fetch tambahan.
export const updateStorageQuotaSchema = z.object({
  quota_gb: z.coerce.number().min(0.1, 'Kuota minimal 0.1 GB'),
  retention_days: z.coerce
    .number()
    .int('Retensi harus bilangan bulat')
    .min(30, 'Retensi minimal 30 hari')
    .max(365, 'Retensi maksimal 365 hari'),
})
export type UpdateStorageQuotaFormValues = z.infer<typeof updateStorageQuotaSchema>
