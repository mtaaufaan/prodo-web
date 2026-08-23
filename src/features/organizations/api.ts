import { apiClient } from '@/lib/api'

import type { CreateOrganizationFormValues, Organization, OrganizationSummary, UpdateOrganizationFormValues } from './types'

export function listOrganizations() {
  return apiClient.get<Organization[]>('/api/v1/organizations')
}

export function createOrganization(values: CreateOrganizationFormValues) {
  return apiClient.post<{ id: string }>('/api/v1/organizations', values)
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

export function getOrganizationSummary(id: string) {
  return apiClient.get<OrganizationSummary>(`/api/v1/organizations/${id}/summary`)
}
