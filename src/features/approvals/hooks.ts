import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { taskKeys } from '@/features/tasks/hooks'

import { decideApproval, listApprovals } from './api'
import type { ApprovalDecision, ApprovalView } from './types'

// Prefiks ['tasks','approvals', ...] -- ikut tervalidasi saat status task berubah dari halaman lain.
export const approvalKeys = {
  all: [...taskKeys.all, 'approvals'] as const,
  list: (projectId: string, view: ApprovalView, page: number, perPage: number) => [...approvalKeys.all, projectId, view, page, perPage] as const,
}

// staleTime 0: keputusan dari Task Detail/Board harus langsung tampak; keepPreviousData: ganti tab tanpa layar kosong.
export function useApprovals(projectId: string, view: ApprovalView, page: number, perPage: number) {
  return useQuery({
    queryKey: approvalKeys.list(projectId, view, page, perPage),
    queryFn: () => listApprovals(projectId, view, page, perPage),
    enabled: Boolean(projectId),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

// Keputusan mengubah status task (DONE / IN PROGRESS): antrean, kartu, Board, dan Task Saya ikut diperbarui.
export function useDecideApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, decision, note }: { taskId: string; decision: ApprovalDecision; note: string }) => decideApproval(taskId, decision, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  })
}
