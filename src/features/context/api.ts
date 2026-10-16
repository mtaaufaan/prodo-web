import { apiClient } from '@/lib/api'

import type { FollowedProject, UserContext } from './types'

export function getMyContext() {
  return apiClient.get<UserContext>('/api/v1/me/context')
}

export function getMyProjects(workspaceId: string) {
  return apiClient.get<FollowedProject[]>(`/api/v1/me/projects?workspace_id=${workspaceId}`)
}

export function switchContext(context: 'ga_console' | 'workspace') {
  return apiClient.patch<{ active_context: string }>('/api/v1/me/context', { context })
}
