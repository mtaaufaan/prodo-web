import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  acknowledgePic,
  addTaskDependency,
  approveTimeEntry,
  assignTasksToSprint,
  bulkSetTaskStatus,
  completeSprint,
  createChecklistItem,
  createCustomStatus,
  createManualTimeEntry,
  createSprint,
  createTask,
  deleteChecklistItem,
  deleteSprint,
  deleteTask,
  getActiveTimer,
  getPicHistory,
  getProjectSprints,
  getProjectTasks,
  getSprintSummary,
  getTask,
  getTaskActivity,
  getTaskChecklistItems,
  getTaskDependencies,
  getTaskStatusSessions,
  getTaskTimeEntries,
  getTaskVersions,
  getWorkspaceStatuses,
  moveStatus,
  rejectTimeEntry,
  reorderTask,
  removeTaskDependency,
  reopenSprint,
  restoreStatus,
  setStatusStartConfirmation,
  setTaskCompleteness,
  setTaskStatus,
  startSprint,
  startTimer,
  startWork,
  stopTimer,
  undefineStatus,
  updateChecklistItem,
  updateManualTimeEntry,
  updateSprint,
  updateStatusAppearance,
  updateTask,
} from './api'
import type { TaskFormValues } from './types'

export const taskKeys = {
  all: ['tasks'] as const,
  statuses: (workspaceId: string) => [...taskKeys.all, 'statuses', workspaceId] as const,
  sprints: (projectId: string) => [...taskKeys.all, 'sprints', projectId] as const,
  sprintSummary: (sprintId: string) => [...taskKeys.all, 'sprint-summary', sprintId] as const,
  list: (projectId: string) => [...taskKeys.all, 'list', projectId] as const,
  detail: (taskId: string) => [...taskKeys.all, 'detail', taskId] as const,
  picHistory: (taskId: string) => [...taskKeys.all, 'pic-history', taskId] as const,
  dependencies: (taskId: string) => [...taskKeys.all, 'dependencies', taskId] as const,
  statusSessions: (taskId: string) => [...taskKeys.all, 'status-sessions', taskId] as const,
  versions: (taskId: string) => [...taskKeys.all, 'versions', taskId] as const,
  activity: (taskId: string, page: number) => [...taskKeys.all, 'activity', taskId, page] as const,
  timeEntries: (taskId: string) => [...taskKeys.all, 'time-entries', taskId] as const,
  activeTimer: (taskId: string) => [...taskKeys.all, 'active-timer', taskId] as const,
  checklistItems: (taskId: string) => [...taskKeys.all, 'checklist-items', taskId] as const,
}

export function useWorkspaceStatuses(workspaceId: string) {
  return useQuery({
    queryKey: taskKeys.statuses(workspaceId),
    queryFn: () => getWorkspaceStatuses(workspaceId),
    enabled: workspaceId !== '',
  })
}

// useCreateCustomStatus/useUpdateStatusAppearance/useMoveStatus/
// useUndefineStatus/useRestoreStatus/useSetStatusStartConfirmation (S4W-05)
// -- semua invalidate taskKeys.statuses(workspaceId) yang sama supaya
// tabel AW Custom Status DAN chip status TaskDetailModal (query key sama)
// ikut ter-refresh dari satu sumber.
export function useCreateCustomStatus(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; color_token: string; position: number }) => createCustomStatus(workspaceId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.statuses(workspaceId) }),
  })
}

export function useUpdateStatusAppearance(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ statusId, input }: { statusId: string; input: { name: string; color_token: string } }) => updateStatusAppearance(statusId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.statuses(workspaceId) }),
  })
}

export function useMoveStatus(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ statusId, direction }: { statusId: string; direction: 'up' | 'down' }) => moveStatus(statusId, direction),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.statuses(workspaceId) }),
  })
}

export function useUndefineStatus(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (statusId: string) => undefineStatus(statusId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.statuses(workspaceId) }),
  })
}

export function useRestoreStatus(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (statusId: string) => restoreStatus(statusId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.statuses(workspaceId) }),
  })
}

export function useSetStatusStartConfirmation(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ statusId, require }: { statusId: string; require: boolean }) => setStatusStartConfirmation(statusId, require),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.statuses(workspaceId) }),
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
    mutationFn: (values: { name: string; start_date?: string; end_date?: string; goal?: string }) => createSprint(projectId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.sprints(projectId) }),
  })
}

export function useUpdateSprint(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sprintId, values }: { sprintId: string; values: { name: string; start_date?: string; end_date?: string; goal?: string } }) =>
      updateSprint(sprintId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.sprints(projectId) }),
  })
}

// useStartSprint invalidate DUA taskKeys.sprints (bukan cuma sprints) --
// mulai sprint baru bisa auto-close sprint lain yang masih aktif di
// project ini (IG-92), task belum-Done-nya ikut pindah ke backlog.
export function useStartSprint(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) => startSprint(sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.sprints(projectId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
    },
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

// useReopenSprint ("↺ BUKA KEMBALI", IG-92 -- baru, tidak ada di S4
// original).
export function useReopenSprint(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) => reopenSprint(sprintId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.sprints(projectId) }),
  })
}

// useAssignTasksToSprint ("Tarik Task dari Backlog" saat buat sprint
// baru, IG-92).
export function useAssignTasksToSprint(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sprintId, taskIds }: { sprintId: string; taskIds: string[] }) => assignTasksToSprint(sprintId, taskIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) }),
  })
}

export function useSprintSummary(sprintId: string) {
  return useQuery({
    queryKey: taskKeys.sprintSummary(sprintId),
    queryFn: () => getSprintSummary(sprintId),
    enabled: sprintId !== '',
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

// useReorderTask -- drag-geser kartu Kanban dalam satu kolom status
// (Track S5, menu Board).
export function useReorderTask(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, targetTaskId, placeBefore }: { taskId: string; targetTaskId: string; placeBefore: boolean }) =>
      reorderTask(taskId, targetTaskId, placeBefore),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) }),
  })
}

// useBulkSetTaskStatus -- "PINDAHKAN & TETAPKAN PIC" bulk action (Track
// S5, menu Board).
export function useBulkSetTaskStatus(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskIds, statusId, picIds }: { taskIds: string[]; statusId: string; picIds: string[] }) =>
      bulkSetTaskStatus(projectId, taskIds, statusId, picIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) }),
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

// useTaskVersions -- IG-97, tab RIWAYAT VERSI.
export function useTaskVersions(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.versions(taskId ?? ''),
    queryFn: () => getTaskVersions(taskId ?? ''),
    enabled: taskId !== null,
  })
}

// useTaskActivity -- IG-94/IG-97, tab AKTIVITAS, paginasi "Grid 1"
// (default 10/halaman sama pola halaman lain).
export function useTaskActivity(taskId: string | null, page: number, perPage = 10) {
  return useQuery({
    queryKey: taskKeys.activity(taskId ?? '', page),
    queryFn: () => getTaskActivity(taskId ?? '', page, perPage),
    enabled: taskId !== null,
  })
}

// Timesheet (IG-97/US-036/037) -- start/stop timer + entri manual +
// approval. Semua invalidate timeEntries+activeTimer+detail (logged_minutes
// di header ikut berubah).
function invalidateTimesheet(queryClient: ReturnType<typeof useQueryClient>, taskId: string) {
  queryClient.invalidateQueries({ queryKey: taskKeys.timeEntries(taskId) })
  queryClient.invalidateQueries({ queryKey: taskKeys.activeTimer(taskId) })
  queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
}

export function useActiveTimer(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.activeTimer(taskId ?? ''),
    queryFn: () => getActiveTimer(taskId ?? ''),
    enabled: taskId !== null,
    refetchInterval: 30000,
  })
}

export function useTaskTimeEntries(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.timeEntries(taskId ?? ''),
    queryFn: () => getTaskTimeEntries(taskId ?? ''),
    enabled: taskId !== null,
  })
}

export function useStartTimer(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => startTimer(taskId),
    onSuccess: () => invalidateTimesheet(queryClient, taskId),
  })
}

export function useStopTimer(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => stopTimer(taskId),
    onSuccess: () => invalidateTimesheet(queryClient, taskId),
  })
}

export function useCreateManualTimeEntry(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { started_at: string; ended_at: string; note?: string }) => createManualTimeEntry(taskId, values),
    onSuccess: () => invalidateTimesheet(queryClient, taskId),
  })
}

export function useUpdateManualTimeEntry(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, values }: { entryId: string; values: { started_at: string; ended_at: string; note?: string } }) =>
      updateManualTimeEntry(entryId, values),
    onSuccess: () => invalidateTimesheet(queryClient, taskId),
  })
}

export function useApproveTimeEntry(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entryId: string) => approveTimeEntry(entryId),
    onSuccess: () => invalidateTimesheet(queryClient, taskId),
  })
}

export function useRejectTimeEntry(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, note }: { entryId: string; note: string }) => rejectTimeEntry(entryId, note),
    onSuccess: () => invalidateTimesheet(queryClient, taskId),
  })
}

// SUB-TASK / checklist item (IG-97 susulan).
export function useTaskChecklistItems(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.checklistItems(taskId ?? ''),
    queryFn: () => getTaskChecklistItems(taskId ?? ''),
    enabled: taskId !== null,
  })
}

export function useCreateChecklistItem(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (title: string) => createChecklistItem(taskId, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.checklistItems(taskId) }),
  })
}

export function useUpdateChecklistItem(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, values }: { itemId: string; values: { title?: string; is_done?: boolean } }) => updateChecklistItem(itemId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.checklistItems(taskId) }),
  })
}

export function useDeleteChecklistItem(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => deleteChecklistItem(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.checklistItems(taskId) }),
  })
}
