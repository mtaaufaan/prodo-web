import { apiClient } from '@/lib/api'

import type { CreateGroupAdminFormValues, GroupAdmin } from './types'

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
