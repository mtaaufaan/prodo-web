import { apiClient } from '@/lib/api'

import type { MyTask } from './types'

export function listMyTasks(projectId: string) {
  return apiClient.get<MyTask[]>(`/api/v1/me/tasks?project_id=${projectId}`)
}

export function postTaskComment(taskId: string, input: { body: string; mentions: number }) {
  return apiClient.post<{ id: string; comment_count: number }>(`/api/v1/tasks/${taskId}/comments`, input)
}
