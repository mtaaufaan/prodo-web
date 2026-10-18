import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api'

// Komentar task (S6E-07; backend S6E-04, API_CONTRACT section 19). Kirim komentar baru memakai
// usePostComment (features/my-tasks/hooks.ts) yang juga menyegarkan daftar ini.
export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  author_name: string
  body: string
  is_edited: boolean
  edited_at: string | null
  created_at: string
  // Ditentukan server: pengirim dalam jendela edit 3 menit / pengirim atau PM/AW.
  can_edit: boolean
  can_delete: boolean
}

export const commentKeys = {
  list: (taskId: string) => ['tasks', 'comments', taskId] as const,
}

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: commentKeys.list(taskId ?? ''),
    queryFn: () => apiClient.get<TaskComment[]>(`/api/v1/tasks/${taskId}/comments`),
    enabled: Boolean(taskId),
    staleTime: 0,
  })
}

export function useEditComment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => apiClient.patch<TaskComment>(`/api/v1/comments/${id}`, { body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentKeys.list(taskId) }),
  })
}

export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/comments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentKeys.list(taskId) }),
  })
}

// describeCommentError -- pesan galat komentar (kode dari backend, S6E-04).
export function describeCommentError(err: unknown, fallback: string): string {
  switch ((err as { code?: string } | null)?.code) {
    case 'FORBIDDEN':
      return 'Role Anda tidak dapat melakukan aksi komentar ini.'
    case 'COMMENT_EDIT_LOCKED':
      return 'Komentar hanya dapat diedit dalam 3 menit setelah dikirim.'
    case 'VALIDATION_ERROR':
      return 'Komentar harus 2-1000 karakter.'
    default:
      return fallback
  }
}
