import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  acknowledgePic,
  addTaskDependency,
  completeSprint,
  createSprint,
  createTask,
  deleteSprint,
  deleteTask,
  getPicHistory,
  getProjectSprints,
  getProjectTasks,
  getTask,
  getTaskDependencies,
  getTaskStatusSessions,
  getWorkspaceStatuses,
  removeTaskDependency,
  setTaskCompleteness,
  setTaskStatus,
  startSprint,
  startWork,
  updateTask,
} from './api'
import type { TaskFormValues } from './types'

export const taskKeys = {
  all: ['tasks'] as const,
  statuses: (workspaceId: string) => [...taskKeys.all, 'statuses', workspaceId] as const,
  sprints: (projectId: string) => [...taskKeys.all, 'sprints', projectId] as const,
  list: (projectId: string) => [...taskKeys.all, 'list', projectId] as const,
  detail: (taskId: string) => [...taskKeys.all, 'detail', taskId] as const,
  picHistory: (taskId: string) => [...taskKeys.all, 'pic-history', taskId] as const,
  dependencies: (taskId: string) => [...taskKeys.all, 'dependencies', taskId] as const,
  statusSessions: (taskId: string) => [...taskKeys.all, 'status-sessions', taskId] as const,
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
    mutationFn: ({ taskId, statusId, picIds }: { taskId: string; statusId: string; picIds: string[] }) => setTaskStatus(taskId, statusId, picIds),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.picHistory(vars.taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.statusSessions(vars.taskId) })
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

export function useAcknowledgePic(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => acknowledgePic(taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) }),
  })
}

export function usePicHistory(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.picHistory(taskId ?? ''),
    queryFn: () => getPicHistory(taskId ?? ''),
    enabled: taskId !== null,
  })
}

export function useSetCompleteness(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, completeness }: { taskId: string; completeness: 'complete' | 'incomplete' }) => setTaskCompleteness(taskId, completeness),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) })
    },
  })
}

export function useTaskDependencies(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.dependencies(taskId ?? ''),
    queryFn: () => getTaskDependencies(taskId ?? ''),
    enabled: taskId !== null,
  })
}

// useAddDependency/useRemoveDependency invalidate list+detail JUGA (bukan
// cuma dependencies) -- Task.is_blocked (S4-53, kolom komputasi backend)
// ikut berubah begitu grafik dependency berubah.
export function useAddDependency(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, predecessorTaskId }: { taskId: string; predecessorTaskId: string }) => addTaskDependency(taskId, predecessorTaskId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.dependencies(vars.taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) })
    },
  })
}

export function useRemoveDependency(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, predecessorTaskId }: { taskId: string; predecessorTaskId: string }) => removeTaskDependency(taskId, predecessorTaskId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.dependencies(vars.taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) })
    },
  })
}

// useStartWork/useTaskStatusSessions -- Phase 4 (US-018b). "Mulai
// Pengerjaan" invalidate status-sessions (kolom work_started_at berubah)
// DAN detail (dipakai cek "sudah start?" di tombol).
export function useStartWork(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => startWork(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.statusSessions(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
    },
  })
}

export function useTaskStatusSessions(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.statusSessions(taskId ?? ''),
    queryFn: () => getTaskStatusSessions(taskId ?? ''),
    enabled: taskId !== null,
  })
}
