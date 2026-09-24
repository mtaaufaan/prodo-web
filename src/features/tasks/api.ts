import { apiClient } from '@/lib/api'

import type { CustomStatus, Sprint, SprintSummary, Task, TaskDependency, TaskFormValues, TaskPicPhase, TaskStatusSession } from './types'

export function getWorkspaceStatuses(workspaceId: string) {
  return apiClient.get<CustomStatus[]>(`/api/v1/workspaces/${workspaceId}/statuses`)
}

// createCustomStatus/updateStatusAppearance/moveStatus/undefineStatus/
// restoreStatus/setStatusStartConfirmation (S4W-05, "AW Custom
// Status.dc.html"/"AW Add Status.dc.html") -- CRUD template status
// workspace, AW-only (ditegakkan backend).
export function createCustomStatus(workspaceId: string, input: { name: string; color_token: string; position: number }) {
  return apiClient.post<CustomStatus>(`/api/v1/workspaces/${workspaceId}/statuses`, input)
}

export function updateStatusAppearance(statusId: string, input: { name: string; color_token: string }) {
  return apiClient.put<{ id: string }>(`/api/v1/statuses/${statusId}/appearance`, input)
}

export function moveStatus(statusId: string, direction: 'up' | 'down') {
  return apiClient.post<{ id: string }>(`/api/v1/statuses/${statusId}/move`, { direction })
}

export function undefineStatus(statusId: string) {
  return apiClient.post<{ id: string }>(`/api/v1/statuses/${statusId}/undefine`)
}

export function restoreStatus(statusId: string) {
  return apiClient.post<{ id: string }>(`/api/v1/statuses/${statusId}/restore`)
}

export function setStatusStartConfirmation(statusId: string, require: boolean) {
  return apiClient.put<{ id: string; require_start_confirmation: boolean }>(`/api/v1/statuses/${statusId}`, { require_start_confirmation: require })
}

export function getProjectSprints(projectId: string) {
  return apiClient.get<Sprint[]>(`/api/v1/projects/${projectId}/sprints`)
}

export function createSprint(projectId: string, values: { name: string; start_date?: string; end_date?: string; goal?: string }) {
  return apiClient.post<Sprint>(`/api/v1/projects/${projectId}/sprints`, values)
}

export function updateSprint(sprintId: string, values: { name: string; start_date?: string; end_date?: string; goal?: string }) {
  return apiClient.put<{ id: string }>(`/api/v1/sprints/${sprintId}`, values)
}

export function startSprint(sprintId: string) {
  return apiClient.post<{ id: string; status: string }>(`/api/v1/sprints/${sprintId}/start`)
}

export function completeSprint(sprintId: string) {
  return apiClient.post<{ id: string; status: string }>(`/api/v1/sprints/${sprintId}/complete`)
}

export function reopenSprint(sprintId: string) {
  return apiClient.post<{ id: string; status: string }>(`/api/v1/sprints/${sprintId}/reopen`)
}

export function assignTasksToSprint(sprintId: string, taskIds: string[]) {
  return apiClient.post<{ id: string; assigned_count: number }>(`/api/v1/sprints/${sprintId}/assign-tasks`, { task_ids: taskIds })
}

export function getSprintSummary(sprintId: string) {
  return apiClient.get<SprintSummary>(`/api/v1/sprints/${sprintId}/summary`)
}

export function deleteSprint(sprintId: string) {
  return apiClient.delete<{ id: string }>(`/api/v1/sprints/${sprintId}`)
}

export function getProjectTasks(projectId: string) {
  return apiClient.get<Task[]>(`/api/v1/projects/${projectId}/tasks`)
}

export function getTask(taskId: string) {
  return apiClient.get<Task>(`/api/v1/tasks/${taskId}`)
}

export function createTask(projectId: string, values: TaskFormValues) {
  return apiClient.post<Task>(`/api/v1/projects/${projectId}/tasks`, values)
}

export function updateTask(taskId: string, values: TaskFormValues) {
  return apiClient.put<{ id: string }>(`/api/v1/tasks/${taskId}`, values)
}

// setTaskStatus -- Phase 2 (US-017): picIds WAJIB (backend 422 pic_required
// kalau kosong).
export function setTaskStatus(taskId: string, statusId: string, picIds: string[]) {
  return apiClient.put<{ id: string; status_id: string }>(`/api/v1/tasks/${taskId}/status`, { status_id: statusId, pic_ids: picIds })
}

export function deleteTask(taskId: string) {
  return apiClient.delete<{ id: string }>(`/api/v1/tasks/${taskId}`)
}

// reorderTask -- drag-geser kartu Kanban DALAM satu kolom status (Track
// S5, IG-9x menu Board). Pindah kolom tetap lewat setTaskStatus di atas.
export function reorderTask(taskId: string, targetTaskId: string, placeBefore: boolean) {
  return apiClient.put<{ id: string }>(`/api/v1/tasks/${taskId}/reorder`, { target_task_id: targetTaskId, place_before: placeBefore })
}

export interface BulkStatusResultItem {
  task_id: string
  ok: boolean
  error?: string
}

// bulkSetTaskStatus -- "PINDAHKAN & TETAPKAN PIC" saat banyak kartu
// dipilih sekaligus (Track S5, menu Board). Per-task hasil dikembalikan,
// bukan all-or-nothing.
export function bulkSetTaskStatus(projectId: string, taskIds: string[], statusId: string, picIds: string[]) {
  return apiClient.post<{ results: BulkStatusResultItem[]; success_count: number; total: number }>(
    `/api/v1/projects/${projectId}/tasks/bulk-status`,
    { task_ids: taskIds, status_id: statusId, pic_ids: picIds },
  )
}

export function acknowledgePic(taskId: string) {
  return apiClient.post<{ id: string }>(`/api/v1/tasks/${taskId}/pic/acknowledge`)
}

export function getPicHistory(taskId: string) {
  return apiClient.get<TaskPicPhase[]>(`/api/v1/tasks/${taskId}/pic-history`)
}

// setTaskCompleteness -- Phase 3 (US-017c): cuma pembuat task/PIC aktif
// yang diizinkan backend (403 selain itu).
export function setTaskCompleteness(taskId: string, completeness: 'complete' | 'incomplete') {
  return apiClient.put<{ id: string; completeness: string }>(`/api/v1/tasks/${taskId}/completeness`, { completeness })
}

export function getTaskDependencies(taskId: string) {
  return apiClient.get<{ predecessors: TaskDependency[]; successors: TaskDependency[] }>(`/api/v1/tasks/${taskId}/dependencies`)
}

// addTaskDependency -- taskId jadi successor, predecessorTaskId jadi
// predecessor (taskId menunggu predecessorTaskId selesai duluan). 409
// CIRCULAR_DEPENDENCY / 422 DEPENDENCY_SELF_REFERENCE|DEPENDENCY_CROSS_PROJECT
// ditangani pemanggil lewat ApiError.code (lib/api.ts).
export function addTaskDependency(taskId: string, predecessorTaskId: string) {
  return apiClient.post<{ predecessor_id: string; successor_id: string; created_at: string }>(`/api/v1/tasks/${taskId}/dependencies`, {
    predecessor_task_id: predecessorTaskId,
  })
}

export function removeTaskDependency(taskId: string, predecessorTaskId: string) {
  return apiClient.delete<void>(`/api/v1/tasks/${taskId}/dependencies/${predecessorTaskId}`)
}

// startWork -- Phase 4 (US-018b/S4-63): "Mulai Pengerjaan", cuma tampil FE
// saat status aktif require_start_confirmation=true dan sesi aktif belum
// start (backend 404/409 kalau tidak ada sesi aktif / sudah start).
export function startWork(taskId: string) {
  return apiClient.post<{ id: string }>(`/api/v1/tasks/${taskId}/start-work`)
}

export function getTaskStatusSessions(taskId: string) {
  return apiClient.get<TaskStatusSession[]>(`/api/v1/tasks/${taskId}/status-sessions`)
}
