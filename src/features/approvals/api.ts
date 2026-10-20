import { apiClient } from '@/lib/api'

import type { ApprovalDecision, ApprovalsPage, ApprovalView, DecisionResult } from './types'

export function listApprovals(projectId: string, view: ApprovalView, page: number, perPage: number) {
  return apiClient.get<ApprovalsPage>(`/api/v1/me/approvals?project_id=${projectId}&view=${view}&page=${page}&per_page=${perPage}`)
}

export function decideApproval(taskId: string, decision: ApprovalDecision, note: string) {
  return apiClient.post<DecisionResult>(`/api/v1/tasks/${taskId}/approval`, { decision, note })
}
