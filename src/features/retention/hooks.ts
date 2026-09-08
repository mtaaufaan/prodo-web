import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { organizationKeys } from '@/features/organizations/hooks'

import { bulkUpdateRetentionPolicy, getRetentionSchedule, requestRetentionExport } from './api'

export const retentionKeys = {
  all: ['retention'] as const,
  schedule: (groupId: string) => [...retentionKeys.all, 'schedule', groupId] as const,
}

export function useRetentionSchedule(groupId: string) {
  return useQuery({
    queryKey: retentionKeys.schedule(groupId),
    queryFn: () => getRetentionSchedule(groupId),
    enabled: groupId !== '',
  })
}

export function useBulkUpdateRetentionPolicy(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (retentions: Record<string, number>) => bulkUpdateRetentionPolicy(groupId, retentions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: retentionKeys.schedule(groupId) })
      // organizations.retention_days berubah -- daftar organisasi (tabel
      // "Retensi Soft-Delete per Organisasi") sumbernya useOrganizationList,
      // query terpisah dari jadwal retensi di atas.
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
    },
  })
}

export function useRequestRetentionExport(groupId: string) {
  return useMutation({
    mutationFn: ({ kind, itemId }: { kind: string; itemId: string }) => requestRetentionExport(groupId, kind, itemId),
  })
}
