import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createOrganization,
  deactivateOrganization,
  deleteOrganization,
  listOrganizations,
  reactivateOrganization,
  updateOrganization,
  updateOrganizationSettings,
  updateOrganizationStorageQuota,
} from './api'
import type { CreateOrganizationFormValues, UpdateOrganizationFormValues } from './types'

export const organizationKeys = {
  all: ['organizations'] as const,
  list: (groupId?: string) => [...organizationKeys.all, 'list', groupId ?? ''] as const,
}

const organizationListQuery = (groupId?: string) =>
  queryOptions({
    queryKey: organizationKeys.list(groupId),
    queryFn: () => listOrganizations(groupId),
  })

// groupId (S4G-32, group switcher) -- diteruskan apa adanya ke API, lihat
// komentar listOrganizations.
export function useOrganizationList(groupId?: string) {
  return useQuery(organizationListQuery(groupId))
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CreateOrganizationFormValues) => createOrganization(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  })
}

export function useUpdateOrganization(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: UpdateOrganizationFormValues) => updateOrganization(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  })
}

export function useDeactivateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateOrganization(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  })
}

export function useReactivateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reactivateOrganization(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  })
}

export function useUpdateOrganizationSettings(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (defaultLanguage: string) => updateOrganizationSettings(id, defaultLanguage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  })
}

export function useUpdateOrganizationStorageQuota(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ quotaBytes, retentionDays }: { quotaBytes: number; retentionDays: number }) =>
      updateOrganizationStorageQuota(id, quotaBytes, retentionDays),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  })
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  })
}
