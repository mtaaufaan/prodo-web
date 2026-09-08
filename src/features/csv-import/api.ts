import { apiClient } from '@/lib/api'

import type { CSVImport, ValidateResult } from './types'

export function downloadMemberImportTemplate(groupId: string) {
  return apiClient.get<Blob>(`/api/v1/groups/${groupId}/data-import/template`, {
    params: { kind: 'member' },
    responseType: 'blob',
  })
}

export function validateMemberImport(groupId: string, orgId: string, file: File) {
  const form = new FormData()
  form.append('org_id', orgId)
  form.append('file', file)
  return apiClient.post<ValidateResult>(`/api/v1/groups/${groupId}/data-import/validate`, form)
}

export function executeImport(groupId: string, importId: string) {
  return apiClient.post<{ import_id: string; status: string }>(`/api/v1/groups/${groupId}/data-import/${importId}/execute`)
}

export function getImport(groupId: string, importId: string) {
  return apiClient.get<CSVImport>(`/api/v1/groups/${groupId}/data-import/${importId}`)
}

export function getImportHistory(groupId: string) {
  return apiClient.get<CSVImport[]>(`/api/v1/groups/${groupId}/data-import/history`)
}

export function downloadImportReport(groupId: string, importId: string) {
  return apiClient.get<Blob>(`/api/v1/groups/${groupId}/data-import/${importId}/report`, { responseType: 'blob' })
}
