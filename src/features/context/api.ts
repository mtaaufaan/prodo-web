import { apiClient } from '@/lib/api'

import type { UserContext } from './types'

export function getMyContext() {
  return apiClient.get<UserContext>('/api/v1/me/context')
}

export function switchContext(context: 'ga_console' | 'workspace') {
  return apiClient.patch<{ active_context: string }>('/api/v1/me/context', { context })
}
