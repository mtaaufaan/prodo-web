import { apiClient } from '@/lib/api'

import type {
  CreateGroupAdminFormValues,
  CreatePlatformAdminFormValues,
  ErasureRequestEntry,
  GroupAdmin,
  GroupDirectoryEntry,
  PlatformAdminAccount,
  PlatformAnomalies,
  PlatformAuditLogEntry,
  PlatformAuditLogFilter,
  PlatformHealthMetrics,
  PlatformTrendPoint,
  RenewGroupContractFormValues,
  ServiceTier,
  ServiceTierFormValues,
  UpdateGroupAdminFormValues,
} from './types'

// ponytail: tidak ada UI paginasi -- endpoint sudah dukung page/per_page,
// tapi jumlah Group Admin diharapkan kecil di S1. Tambah kontrol halaman
// kalau daftarnya benar-benar tumbuh besar nanti.
export function listGroupAdmins() {
  return apiClient.get<GroupAdmin[]>('/api/v1/platform/group-admins')
}

// createGroupAdmin -- linked_existing_admin (S4G-33, Track S4G): true
// kalau email yang diminta match GA aktif existing -- grup baru ditautkan
// ke akun itu, TANPA invitation baru (expires_at tidak ada di respons itu).
export function createGroupAdmin(values: CreateGroupAdminFormValues) {
  return apiClient.post<{ id: string; linked_existing_admin: boolean; expires_at?: string }>('/api/v1/platform/group-admins', values)
}

export function resendActivation(id: string) {
  return apiClient.post<{ id: string }>(`/api/v1/platform/group-admins/${id}/resend-activation`)
}

// getGroupAdmin/updateGroupAdmin -- S4P-06, mode Lihat/Ubah. groupId
// (S4G-33) WAJIB disebut eksplisit -- satu baris panel PA sekarang satu
// grup, bukan "grup pertama" GA lagi (DATABASE_SCHEMA.md §5.6
// many-to-many). null berarti baris 0-grup.
export function getGroupAdmin(id: string, groupId: string | null) {
  return apiClient.get<GroupAdmin>(`/api/v1/platform/group-admins/${id}`, { params: { group_id: groupId ?? '' } })
}

export function updateGroupAdmin(id: string, groupId: string | null, values: UpdateGroupAdminFormValues) {
  return apiClient.put<GroupAdmin>(`/api/v1/platform/group-admins/${id}`, { ...values, group_id: groupId ?? '' })
}

// renewGroupContract -- kontrak grup (dikonfirmasi user 2026-08-29):
// dipakai baik untuk kontrak PERTAMA (belum pernah ada) maupun
// PERPANJANGAN, backend yang membedakan audit action-nya. groupId
// (S4G-33) WAJIB.
export function renewGroupContract(id: string, groupId: string, values: RenewGroupContractFormValues) {
  return apiClient.post<{ contract_end_at: string }>(`/api/v1/platform/group-admins/${id}/renew-contract`, { ...values, group_id: groupId })
}

// listServiceTiers -- S4P-07/11. includeArchived=false (default, dropdown
// Tier + panel "Paket Tier (Otomatis)") cuma tier assignable; true
// (halaman "Tier & Kuota Global") termasuk yang nonaktif/archived.
export function listServiceTiers(includeArchived = false) {
  return apiClient.get<ServiceTier[]>('/api/v1/platform/tiers', {
    params: includeArchived ? { all: true } : undefined,
  })
}

// createTier/updateTier/deactivateTier/reactivateTier/archiveTier/
// unarchiveTier/deleteTier -- S4P-11, halaman "Tier & Kuota Global".
export function createTier(values: ServiceTierFormValues) {
  return apiClient.post<{ id: string }>('/api/v1/platform/tiers', values)
}

export function updateTier(id: string, values: ServiceTierFormValues) {
  return apiClient.put<{ id: string }>(`/api/v1/platform/tiers/${id}`, values)
}

export function deactivateTier(id: string) {
  return apiClient.put<{ id: string }>(`/api/v1/platform/tiers/${id}/deactivate`)
}

export function reactivateTier(id: string) {
  return apiClient.put<{ id: string }>(`/api/v1/platform/tiers/${id}/reactivate`)
}

export function archiveTier(id: string) {
  return apiClient.put<{ id: string }>(`/api/v1/platform/tiers/${id}/archive`)
}

export function unarchiveTier(id: string) {
  return apiClient.put<{ id: string }>(`/api/v1/platform/tiers/${id}/unarchive`)
}

export function deleteTier(id: string) {
  return apiClient.delete<void>(`/api/v1/platform/tiers/${id}`)
}

// listAuditLogs -- S4P-22, US-071. per_page dipatok ke maxAuditLogPerPage
// backend (200) sekali ambil -- tanpa kontrol paginasi FE, pola sama
// dengan listGroupAdmins di atas ("ponytail" komentar); export CSV
// (exportAuditLogsCSV) yang menjadi jalan keluar untuk dataset besar.
export function listAuditLogs(filter: PlatformAuditLogFilter) {
  return apiClient.get<PlatformAuditLogEntry[]>('/api/v1/platform/audit-logs', {
    params: { ...filter, per_page: 200 },
  })
}

// exportAuditLogsCSV -- unduh CSV hasil filter yang sama (tanpa per_page --
// backend membatasi sendiri ke csvExportLimit). Blob (bukan JSON) supaya
// FE bisa memicu unduhan file lewat URL objek sementara.
export function exportAuditLogsCSV(filter: PlatformAuditLogFilter) {
  return apiClient.get<Blob>('/api/v1/platform/audit-logs', {
    params: { ...filter, export: 'csv' },
    responseType: 'blob',
  })
}

// getHealthMetrics/getTrends/getAnomalies -- S4P-24/25/26, US-072,
// halaman "Dashboard Kesehatan Platform".
export function getHealthMetrics() {
  return apiClient.get<PlatformHealthMetrics>('/api/v1/platform/health-metrics')
}

export function getTrends(period: 7 | 30 | 90) {
  return apiClient.get<PlatformTrendPoint[]>('/api/v1/platform/trends', { params: { period } })
}

export function getAnomalies(period: 7 | 30 | 90) {
  return apiClient.get<PlatformAnomalies>('/api/v1/platform/anomalies', { params: { period } })
}

// listErasureRequests/executeErasureRequest/rejectErasureRequest -- S4P-30/31,
// US-060, halaman "Right to Erasure".
export function listErasureRequests() {
  return apiClient.get<ErasureRequestEntry[]>('/api/v1/platform/erasure-requests')
}

// executeErasureRequest -- confirmation harus persis "KONFIRMASI" (konfirmasi
// dua langkah, ditegakkan juga di backend -- lihat ErasureConfirmModal).
export function executeErasureRequest(id: string, confirmation: string) {
  return apiClient.post<{ status: string }>(`/api/v1/platform/erasure-requests/${id}/execute`, { confirmation })
}

export function rejectErasureRequest(id: string) {
  return apiClient.post<{ status: string }>(`/api/v1/platform/erasure-requests/${id}/reject`)
}

// listGroups -- S4P-34/36, US-083. Dipakai GroupDirectoryPage (PA) DAN
// picker grup di CreateOrganizationModal (PA/GA) -- otorisasi PA/GA
// ditegakkan backend (query), bukan di sini.
export function listGroups(q?: string) {
  return apiClient.get<GroupDirectoryEntry[]>('/api/v1/platform/groups', { params: q ? { q } : undefined })
}

// listPlatformAdmins/createPlatformAdmin/deactivatePlatformAdmin/
// reactivatePlatformAdmin/resetPlatformAdminMFA -- S4P-37/38/39/40,
// US-084, halaman "Kelola Akun Platform Admin".
export function listPlatformAdmins() {
  return apiClient.get<PlatformAdminAccount[]>('/api/v1/platform/admins')
}

export function createPlatformAdmin(values: CreatePlatformAdminFormValues) {
  return apiClient.post<{ id: string }>('/api/v1/platform/admins', values)
}

export function deactivatePlatformAdmin(id: string) {
  return apiClient.put<{ id: string; suspended: boolean }>(`/api/v1/platform/admins/${id}/deactivate`)
}

export function reactivatePlatformAdmin(id: string) {
  return apiClient.put<{ id: string; suspended: boolean }>(`/api/v1/platform/admins/${id}/reactivate`)
}

export function resetPlatformAdminMFA(id: string) {
  return apiClient.post<{ id: string; mfa_reset: boolean }>(`/api/v1/platform/admins/${id}/reset-mfa`)
}
