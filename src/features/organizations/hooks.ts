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
  list: () => [...organizationKeys.all, 'list'] as const,
}

const organizationListQuery = () =>
  queryOptions({
    queryKey: organizationKeys.list(),
    queryFn: () => listOrganizations(),
  })

export function useOrganizationList() {
  return useQuery(organizationListQuery())
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
