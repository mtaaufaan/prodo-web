import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  completeSprint,
  createSprint,
  createTask,
  deleteSprint,
  deleteTask,
  getProjectSprints,
  getProjectTasks,
  getTask,
  getWorkspaceStatuses,
  setTaskStatus,
  startSprint,
  updateTask,
} from './api'
import type { TaskFormValues } from './types'

export const taskKeys = {
  all: ['tasks'] as const,
  statuses: (workspaceId: string) => [...taskKeys.all, 'statuses', workspaceId] as const,
  sprints: (projectId: string) => [...taskKeys.all, 'sprints', projectId] as const,
  list: (projectId: string) => [...taskKeys.all, 'list', projectId] as const,
  detail: (taskId: string) => [...taskKeys.all, 'detail', taskId] as const,
}

export function useWorkspaceStatuses(workspaceId: string) {
  return useQuery({
    queryKey: taskKeys.statuses(workspaceId),
    queryFn: () => getWorkspaceStatuses(workspaceId),
    enabled: workspaceId !== '',
  })
}

export function useProjectSprints(projectId: string) {
  return useQuery({
    queryKey: taskKeys.sprints(projectId),
    queryFn: () => getProjectSprints(projectId),
    enabled: projectId !== '',
  })
}

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: taskKeys.list(projectId),
    queryFn: () => getProjectTasks(projectId),
    enabled: projectId !== '',
  })
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.detail(taskId ?? ''),
    queryFn: () => getTask(taskId ?? ''),
    enabled: taskId !== null,
  })
}

export function useCreateSprint(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { name: string; start_date?: string; end_date?: string }) => createSprint(projectId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.sprints(projectId) }),
  })
}

export function useStartSprint(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) => startSprint(sprintId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.sprints(projectId) }),
  })
}

export function useCompleteSprint(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) => completeSprint(sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.sprints(projectId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
    },
  })
}

export function useDeleteSprint(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) => deleteSprint(sprintId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.sprints(projectId) }),
  })
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: TaskFormValues) => createTask(projectId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) }),
  })
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, values }: { taskId: string; values: TaskFormValues }) => updateTask(taskId, values),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) })
    },
  })
}

export function useSetTaskStatus(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, statusId }: { taskId: string; statusId: string }) => setTaskStatus(taskId, statusId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) })
    },
  })
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) }),
  })
}
