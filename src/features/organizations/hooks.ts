import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addOrganizationDomain,
  createOrganization,
  deactivateOrganization,
  deleteOrganization,
  listOrganizationDomains,
  listOrganizations,
  reactivateOrganization,
  removeOrganizationDomain,
  restoreOrganization,
  updateOrganization,
  updateOrganizationSettings,
  updateOrganizationStorageQuota,
} from './api'
import type { CreateOrganizationFormValues, UpdateOrganizationFormValues } from './types'

export const organizationKeys = {
  all: ['organizations'] as const,
  list: (groupId?: string) => [...organizationKeys.all, 'list', groupId ?? ''] as const,
  domains: (orgId: string) => [...organizationKeys.all, 'domains', orgId] as const,
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

// Domain email resmi (2026-09-11): satu organisasi bisa punya lebih dari
// satu domain -- query terpisah dari list organisasi (butuh `id` per
// domain untuk tombol hapus, lihat komentar listOrganizationDomains di api.ts).
export function useOrganizationDomains(orgId: string) {
  return useQuery({
    queryKey: organizationKeys.domains(orgId),
    queryFn: () => listOrganizationDomains(orgId),
    enabled: orgId !== '',
  })
}

export function useAddOrganizationDomain(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (domainValue: string) => addOrganizationDomain(orgId, domainValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.domains(orgId) })
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
    },
  })
}

export function useRemoveOrganizationDomain(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (domainId: string) => removeOrganizationDomain(orgId, domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.domains(orgId) })
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
    },
  })
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  })
}

export function useRestoreOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restoreOrganization(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  })
}
