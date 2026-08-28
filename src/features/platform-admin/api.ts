import { apiClient } from '@/lib/api'

import type { CreateGroupAdminFormValues, GroupAdmin, ServiceTier, ServiceTierFormValues, UpdateGroupAdminFormValues } from './types'

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
