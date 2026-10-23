import { apiClient } from '@/lib/api'

import type { LogTimeResult, MyHoursTimesheet, TimesheetView } from './types'

// Kontrak API (API_CONTRACT section 19.5, S6E-10). Catatan: GET /me/timesheets sudah dipakai tab "Timesheet Saya" PM
// dengan parameter from/to; mode workspace_id/view ditambahkan S6E-10 tanpa mengubah mode lama.
export function getMyHours(workspaceId: string, view: TimesheetView, page: number, perPage: number) {
  return apiClient.get<MyHoursTimesheet>('/api/v1/me/timesheets', {
    params: { workspace_id: workspaceId, view, page, per_page: perPage },
  })
}

export function postTimeLog(taskId: string, hours: number, note: string) {
  return apiClient.post<LogTimeResult>(`/api/v1/tasks/${taskId}/time-log`, { hours, note: note || undefined })
}
