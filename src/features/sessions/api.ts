import { apiClient } from '@/lib/api'

import type { SessionSummary } from './types'

export function listSessions() {
  return apiClient.get<SessionSummary[]>('/api/v1/auth/sessions')
}

export function revokeSession(jti: string) {
  return apiClient.delete<void>(`/api/v1/auth/sessions/${jti}`)
}

export function revokeAllSessions() {
  return apiClient.delete<void>('/api/v1/auth/sessions')
}
