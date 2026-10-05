import { apiClient } from '@/lib/api'

import type { ProjectImport, ProjectImportKind, ProjectImportValidateResult } from './types'

const base = (projectId: string) => `/api/v1/projects/${projectId}/data-import`

export function downloadProjectImportTemplate(projectId: string, kind: ProjectImportKind) {
  return apiClient.get<Blob>(`${base(projectId)}/template`, { params: { kind }, responseType: 'blob' })
}

export function validateProjectImport(projectId: string, kind: ProjectImportKind, file: File) {
  const form = new FormData()
  form.append('kind', kind)
  form.append('file', file)
  return apiClient.post<ProjectImportValidateResult>(`${base(projectId)}/validate`, form)
}

export function executeProjectImport(projectId: string, importId: string) {
  return apiClient.post<ProjectImport>(`${base(projectId)}/${importId}/execute`)
}

export function getProjectImportHistory(projectId: string) {
  return apiClient.get<ProjectImport[]>(`${base(projectId)}/history`)
}

export function downloadProjectImportReport(projectId: string, importId: string, onlySkipped: boolean) {
  return apiClient.get<Blob>(`${base(projectId)}/${importId}/report`, {
    params: onlySkipped ? { only: 'skipped' } : undefined,
    responseType: 'blob',
  })
}
