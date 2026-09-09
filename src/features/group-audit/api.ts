import { apiClient } from '@/lib/api'

import type { GroupAuditActor, GroupAuditLogEntry, GroupAuditLogFilter } from './types'

// listGroupAuditLogs -- per_page dipatok tinggi (200) sekali ambil, filter
// halaman dilakukan di klien -- pola sama listAuditLogs Platform Audit
// Trail (S4P-22), CSV export jadi jalan keluar untuk dataset besar.
export function listGroupAuditLogs(groupId: string, filter: GroupAuditLogFilter) {
  return apiClient.get<GroupAuditLogEntry[]>(`/api/v1/groups/${groupId}/audit-logs`, {
    params: { ...filter, per_page: 200 },
  })
}

export function getGroupAuditActors(groupId: string) {
  return apiClient.get<GroupAuditActor[]>(`/api/v1/groups/${groupId}/audit-logs/actors`)
}

export function exportGroupAuditLogsCSV(groupId: string, filter: GroupAuditLogFilter) {
  return apiClient.get<Blob>(`/api/v1/groups/${groupId}/audit-logs`, {
    params: { ...filter, export: 'csv' },
    responseType: 'blob',
  })
}
