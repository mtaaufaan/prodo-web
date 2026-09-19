import { apiClient } from '@/lib/api'

import type { Attachment, DocumentFilter, QuotaOverview } from './types'

export function uploadAttachment(taskId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiClient.post<Attachment>(`/api/v1/tasks/${taskId}/attachments`, form)
}

export function getTaskAttachments(taskId: string) {
  return apiClient.get<Attachment[]>(`/api/v1/tasks/${taskId}/attachments`)
}

export function downloadAttachment(id: string) {
  return apiClient.get<Blob>(`/api/v1/attachments/${id}/download`, { responseType: 'blob' })
}

export function renameAttachment(id: string, displayName: string) {
  return apiClient.put<{ id: string }>(`/api/v1/attachments/${id}`, { display_name: displayName })
}

export function deleteAttachment(id: string) {
  return apiClient.delete<{ id: string }>(`/api/v1/attachments/${id}`)
}

export function restoreAttachment(id: string) {
  return apiClient.post<{ id: string }>(`/api/v1/attachments/${id}/restore`)
}

export function getWorkspaceDocuments(workspaceId: string, filter: DocumentFilter) {
  return apiClient.get<Attachment[]>(`/api/v1/workspaces/${workspaceId}/documents`, { params: filter })
}

export function getDocumentsQuota(workspaceId: string) {
  return apiClient.get<QuotaOverview>(`/api/v1/workspaces/${workspaceId}/documents/quota`)
}

export function deleteDocument(workspaceId: string, id: string, mode: string, confirmWorkspaceName?: string) {
  return apiClient.delete<{ id: string }>(`/api/v1/workspaces/${workspaceId}/documents/${id}`, {
    data: { mode, confirm_workspace_name: confirmWorkspaceName },
  })
}

export function bulkDeleteDocuments(workspaceId: string, ids: string[], mode: string, confirmWorkspaceName?: string) {
  return apiClient.post<{ succeeded: number; total: number }>(`/api/v1/workspaces/${workspaceId}/documents/bulk-delete`, {
    ids,
    mode,
    confirm_workspace_name: confirmWorkspaceName,
  })
}

export function requestDocumentsQuota(workspaceId: string, additionalGb: number, reason: string) {
  return apiClient.post<{ sent: boolean }>(`/api/v1/workspaces/${workspaceId}/documents/quota-request`, {
    additional_gb: additionalGb,
    reason,
  })
}
