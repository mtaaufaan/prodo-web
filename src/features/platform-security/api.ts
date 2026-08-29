import { apiClient } from '@/lib/api'

import type { SecuritySettings } from './types'

// S4P-18, US-070: session timeout PER-AKUN (dibalik 2026-08-29, dikonfirmasi
// user) + IP allowlist GLOBAL untuk semua akun PA (juga dibalik), dengan
// flag ip_allowlist_enabled terpisah dari isi daftar.
export function getSecuritySettings() {
  return apiClient.get<SecuritySettings>('/api/v1/platform/security-settings')
}

export function updateSessionTimeoutSeconds(seconds: number) {
  return apiClient.put<{ session_idle_timeout_seconds: number }>(
    '/api/v1/platform/security-settings/session-timeout',
    { seconds },
  )
}

export function updateIPAllowlistEnabled(enabled: boolean) {
  return apiClient.put<{ ip_allowlist_enabled: boolean }>(
    '/api/v1/platform/security-settings/ip-allowlist/enabled',
    { enabled },
  )
}

export function addIPAllowlistEntry(cidr: string) {
  return apiClient.post<{ id: string; cidr: string }>('/api/v1/platform/security-settings/ip-allowlist', {
    cidr,
  })
}

export function deleteIPAllowlistEntry(id: string) {
  return apiClient.delete<{ id: string; deleted: boolean }>(
    `/api/v1/platform/security-settings/ip-allowlist/${id}`,
  )
}
