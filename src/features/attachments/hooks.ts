import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  bulkDeleteDocuments,
  deleteAttachment,
  deleteDocument,
  getDocumentsQuota,
  getTaskAttachments,
  getWorkspaceDocuments,
  renameAttachment,
  requestDocumentsQuota,
  restoreAttachment,
  uploadAttachment,
} from './api'
import type { DocumentFilter } from './types'

export const attachmentKeys = {
  all: ['attachments'] as const,
  task: (taskId: string) => [...attachmentKeys.all, 'task', taskId] as const,
  workspace: (workspaceId: string, filter: DocumentFilter) => [...attachmentKeys.all, 'workspace', workspaceId, filter] as const,
  quota: (workspaceId: string) => [...attachmentKeys.all, 'quota', workspaceId] as const,
}

export function useTaskAttachments(taskId: string | null) {
  return useQuery({
    queryKey: attachmentKeys.task(taskId ?? ''),
    queryFn: () => getTaskAttachments(taskId ?? ''),
    enabled: taskId !== null && taskId !== '',
  })
}

export function useUploadAttachment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadAttachment(taskId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attachmentKeys.task(taskId) }),
  })
}

export function useRenameAttachment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, displayName }: { id: string; displayName: string }) => renameAttachment(id, displayName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attachmentKeys.task(taskId) }),
  })
}

export function useDeleteAttachment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAttachment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attachmentKeys.task(taskId) }),
  })
}

export function useWorkspaceDocuments(workspaceId: string, filter: DocumentFilter) {
  return useQuery({
    queryKey: attachmentKeys.workspace(workspaceId, filter),
    queryFn: () => getWorkspaceDocuments(workspaceId, filter),
    enabled: workspaceId !== '',
  })
}

export function useDocumentsQuota(workspaceId: string) {
  return useQuery({
    queryKey: attachmentKeys.quota(workspaceId),
    queryFn: () => getDocumentsQuota(workspaceId),
    enabled: workspaceId !== '',
  })
}

function useInvalidateWorkspaceDocs() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: attachmentKeys.all })
  }
}

export function useDeleteDocument(workspaceId: string) {
  const invalidate = useInvalidateWorkspaceDocs()
  return useMutation({
    mutationFn: ({ id, mode, confirmWorkspaceName }: { id: string; mode: string; confirmWorkspaceName?: string }) =>
      deleteDocument(workspaceId, id, mode, confirmWorkspaceName),
    onSuccess: invalidate,
  })
}

export function useBulkDeleteDocuments(workspaceId: string) {
  const invalidate = useInvalidateWorkspaceDocs()
  return useMutation({
    mutationFn: ({ ids, mode, confirmWorkspaceName }: { ids: string[]; mode: string; confirmWorkspaceName?: string }) =>
      bulkDeleteDocuments(workspaceId, ids, mode, confirmWorkspaceName),
    onSuccess: invalidate,
  })
}

export function useRestoreDocument() {
  const invalidate = useInvalidateWorkspaceDocs()
  return useMutation({
    mutationFn: (id: string) => restoreAttachment(id),
    onSuccess: invalidate,
  })
}

export function useRequestQuota(workspaceId: string) {
  return useMutation({
    mutationFn: ({ additionalGb, reason }: { additionalGb: number; reason: string }) => requestDocumentsQuota(workspaceId, additionalGb, reason),
  })
}
