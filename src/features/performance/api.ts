import { apiClient } from '@/lib/api'

import type { PerformanceDashboard } from './types'

export function getWorkspacePerformance(workspaceId: string, projectId: string, rangeDays: number) {
  return apiClient.get<PerformanceDashboard>(`/api/v1/workspaces/${workspaceId}/performance`, {
    params: { project_id: projectId || undefined, range: rangeDays },
  })
}

export function getProjectPerformance(projectId: string, rangeDays: number) {
  return apiClient.get<PerformanceDashboard>(`/api/v1/projects/${projectId}/performance`, {
    params: { range: rangeDays },
  })
}
