import { apiClient } from '@/lib/api'

import type { ApprovalFilter, ManualEntryRow, MyTimesheet, ProjectTimesheet } from './types'

export function getProjectTimesheet(projectId: string) {
  return apiClient.get<ProjectTimesheet>(`/api/v1/projects/${projectId}/timesheet`)
}

export function getTimesheetEntries(projectId: string, approval: ApprovalFilter) {
  return apiClient.get<{ items: ManualEntryRow[]; total: number }>(`/api/v1/projects/${projectId}/timesheet/entries`, {
    params: { approval_status: approval },
  })
}

export function exportProjectTimesheetCSV(projectId: string) {
  return apiClient.get<Blob>(`/api/v1/projects/${projectId}/timesheet/export`, { responseType: 'blob' })
}

export function getMyTimesheet(from: string, to: string) {
  return apiClient.get<MyTimesheet>('/api/v1/me/timesheets', { params: { from: from || undefined, to: to || undefined } })
}
