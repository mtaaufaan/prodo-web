import { apiClient } from '@/lib/api'

import type { SsoConfig, SsoConfigFormValues } from './types'

export function getSsoConfig(orgId: string) {
  return apiClient.get<SsoConfig>(`/api/v1/organizations/${orgId}/sso-config`)
}

// updateSsoConfig -- client_secret kosong berarti tidak diubah (backend
// mempertahankan secret lama, lihat SSOConfigRepository.Upsert).
export function updateSsoConfig(orgId: string, values: SsoConfigFormValues) {
  return apiClient.put<{ id: string }>(`/api/v1/organizations/${orgId}/sso-config`, values)
}
