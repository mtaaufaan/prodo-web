import { apiClient } from '@/lib/api'

import type { SecuritySettings } from './types'

// S4P-18, US-070: session timeout GLOBAL (semua akun PA) + IP allowlist
// SELF-SERVICE (entry milik akun yang sedang login saja).
export function getSecuritySettings() {
  return apiClient.get<SecuritySettings>('/api/v1/platform/security-settings')
}

export function updateSessionTimeoutSeconds(seconds: number) {
  return apiClient.put<{ session_idle_timeout_seconds: number }>(
    '/api/v1/platform/security-settings/session-timeout',
    { seconds },
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
