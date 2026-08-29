import { apiClient } from '@/lib/api'

import type {
  CreateGroupAdminFormValues,
  ErasureRequestEntry,
  GroupAdmin,
  GroupDirectoryEntry,
  PlatformAnomalies,
  PlatformAuditLogEntry,
  PlatformAuditLogFilter,
  PlatformHealthMetrics,
  PlatformTrendPoint,
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

export function createGroupAdmin(values: CreateGroupAdminFormValues) {
  return apiClient.post<{ id: string }>('/api/v1/platform/group-admins', values)
}

export function resendActivation(id: string) {
  return apiClient.post<{ id: string }>(`/api/v1/platform/group-admins/${id}/resend-activation`)
}

// getGroupAdmin/updateGroupAdmin -- S4P-06, mode Lihat/Ubah.
export function getGroupAdmin(id: string) {
  return apiClient.get<GroupAdmin>(`/api/v1/platform/group-admins/${id}`)
}

export function updateGroupAdmin(id: string, values: UpdateGroupAdminFormValues) {
  return apiClient.put<GroupAdmin>(`/api/v1/platform/group-admins/${id}`, values)
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

export function getAnomalies() {
  return apiClient.get<PlatformAnomalies>('/api/v1/platform/anomalies')
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
