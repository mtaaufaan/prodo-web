import { apiClient } from '@/lib/api'

import type { MyTasksPage, MyTaskView, PostCommentResult } from './types'

export function listMyTasks(projectId: string, view: MyTaskView, page: number, perPage: number) {
  return apiClient.get<MyTasksPage>(`/api/v1/me/tasks?project_id=${projectId}&view=${view}&page=${page}&per_page=${perPage}`)
}

export function postTaskComment(taskId: string, body: string) {
  return apiClient.post<PostCommentResult>(`/api/v1/tasks/${taskId}/comments`, { body })
}
