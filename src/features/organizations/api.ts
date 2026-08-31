import { apiClient } from '@/lib/api'

import type { CreateOrganizationFormValues, OrganizationListResult, UpdateOrganizationFormValues } from './types'

export function listOrganizations() {
  return apiClient.get<OrganizationListResult>('/api/v1/organizations')
}

export function createOrganization(values: CreateOrganizationFormValues) {
  const { quota_gb, ...rest } = values
  return apiClient.post<{ id: string }>('/api/v1/organizations', {
    ...rest,
    storage_quota_bytes: Math.round(quota_gb * 1024 * 1024 * 1024),
  })
}

export function updateOrganization(id: string, values: UpdateOrganizationFormValues) {
  return apiClient.put<{ id: string }>(`/api/v1/organizations/${id}`, values)
}

export function deactivateOrganization(id: string) {
  return apiClient.put<{ id: string; deactivated: boolean }>(`/api/v1/organizations/${id}/deactivate`)
}

export function reactivateOrganization(id: string) {
  return apiClient.put<{ id: string; deactivated: boolean }>(`/api/v1/organizations/${id}/reactivate`)
}

export function deleteOrganization(id: string) {
  return apiClient.delete<void>(`/api/v1/organizations/${id}`)
}

export function updateOrganizationSettings(id: string, defaultLanguage: string) {
  return apiClient.put<{ id: string; default_language: string }>(`/api/v1/organizations/${id}/settings`, {
    default_language: defaultLanguage,
  })
}

export function updateOrganizationStorageQuota(id: string, quotaBytes: number, retentionDays: number) {
  return apiClient.put<{ id: string; storage_quota_bytes: number; retention_days: number }>(
    `/api/v1/organizations/${id}/storage-quota`,
    { storage_quota_bytes: quotaBytes, retention_days: retentionDays },
  )
}
