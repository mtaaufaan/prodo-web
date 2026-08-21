import { apiClient } from '@/lib/api'

import type { SessionSummary } from './types'

export function listSessions() {
  return apiClient.get<SessionSummary[]>('/api/v1/auth/sessions')
}
