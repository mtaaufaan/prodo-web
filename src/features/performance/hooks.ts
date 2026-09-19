import { useQuery } from '@tanstack/react-query'

import { getProjectPerformance, getWorkspacePerformance } from './api'

export const performanceKeys = {
  all: ['performance'] as const,
  workspace: (workspaceId: string, projectId: string, rangeDays: number) =>
    [...performanceKeys.all, 'workspace', workspaceId, projectId, rangeDays] as const,
  project: (projectId: string, rangeDays: number) => [...performanceKeys.all, 'project', projectId, rangeDays] as const,
}

export function useWorkspacePerformance(workspaceId: string, projectId: string, rangeDays: number, enabled: boolean) {
  return useQuery({
    queryKey: performanceKeys.workspace(workspaceId, projectId, rangeDays),
    queryFn: () => getWorkspacePerformance(workspaceId, projectId, rangeDays),
    enabled: enabled && workspaceId !== '',
  })
}

export function useProjectPerformance(projectId: string, rangeDays: number, enabled: boolean) {
  return useQuery({
    queryKey: performanceKeys.project(projectId, rangeDays),
    queryFn: () => getProjectPerformance(projectId, rangeDays),
    enabled: enabled && projectId !== '',
  })
}
