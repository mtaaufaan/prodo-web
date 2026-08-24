import { apiClient } from '@/lib/api'

import type { CreateGroupAdminFormValues, GroupAdmin, ServiceTier, UpdateGroupAdminFormValues } from './types'

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

// listServiceTiers -- S4P-07, katalog tier untuk dropdown Tier + panel
// "Paket Tier (Otomatis)".
export function listServiceTiers() {
  return apiClient.get<ServiceTier[]>('/api/v1/platform/tiers')
}
