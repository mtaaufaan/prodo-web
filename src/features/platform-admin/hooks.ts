import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  archiveTier,
  createGroupAdmin,
  createTier,
  deactivateTier,
  deleteTier,
  getAnomalies,
  getGroupAdmin,
  getHealthMetrics,
  getTrends,
  listAuditLogs,
  listGroupAdmins,
  listServiceTiers,
  reactivateTier,
  resendActivation,
  unarchiveTier,
  updateGroupAdmin,
  updateTier,
} from './api'
import type { CreateGroupAdminFormValues, PlatformAuditLogFilter, ServiceTierFormValues, UpdateGroupAdminFormValues } from './types'

export const groupAdminKeys = {
  all: ['group-admins'] as const,
  list: () => [...groupAdminKeys.all, 'list'] as const,
  detail: (id: string) => [...groupAdminKeys.all, 'detail', id] as const,
}

const groupAdminListQuery = () =>
  queryOptions({
    queryKey: groupAdminKeys.list(),
    queryFn: () => listGroupAdmins(),
  })

export function useGroupAdminList() {
  return useQuery(groupAdminListQuery())
}

// useGroupAdminDetail -- S4P-06, mode Lihat/Ubah. enabled:false kalau id
// kosong (mode Tambah tidak butuh fetch detail).
export function useGroupAdminDetail(id: string | null) {
  return useQuery({
    queryKey: groupAdminKeys.detail(id ?? ''),
    queryFn: () => getGroupAdmin(id as string),
    enabled: id != null,
  })
}

export function useCreateGroupAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CreateGroupAdminFormValues) => createGroupAdmin(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupAdminKeys.all }),
  })
}

export function useUpdateGroupAdmin(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: UpdateGroupAdminFormValues) => updateGroupAdmin(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupAdminKeys.all }),
  })
}

export function useResendActivation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => resendActivation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupAdminKeys.all }),
  })
}

// serviceTierKeys -- dua daftar terpisah (assignable-only vs all) supaya
// invalidate salah satu tidak menyisakan cache basi di yang lain.
const serviceTierKeys = {
  all: (includeArchived: boolean) => ['service-tiers', includeArchived] as const,
}

const serviceTiersQuery = (includeArchived: boolean) =>
  queryOptions({
    queryKey: serviceTierKeys.all(includeArchived),
    queryFn: () => listServiceTiers(includeArchived),
    staleTime: 5 * 60 * 1000, // katalog tier jarang berubah
  })

// useServiceTiers -- includeArchived=false (default, dropdown Tier di
// form Group Admin) cuma tier assignable; true (halaman "Tier & Kuota
// Global") termasuk yang nonaktif/archived.
export function useServiceTiers(includeArchived = false) {
  return useQuery(serviceTiersQuery(includeArchived))
}

function useInvalidateServiceTiers() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['service-tiers'] })
    // tier yang berubah bisa memengaruhi tampilan GA (nama tier, batas) --
    // ikut invalidate daftar/detail GA.
    queryClient.invalidateQueries({ queryKey: groupAdminKeys.all })
  }
}

export function useCreateTier() {
  const invalidate = useInvalidateServiceTiers()
  return useMutation({
    mutationFn: (values: ServiceTierFormValues) => createTier(values),
    onSuccess: invalidate,
  })
}

export function useUpdateTier(id: string) {
  const invalidate = useInvalidateServiceTiers()
  return useMutation({
    mutationFn: (values: ServiceTierFormValues) => updateTier(id, values),
    onSuccess: invalidate,
  })
}

export function useDeactivateTier() {
  const invalidate = useInvalidateServiceTiers()
  return useMutation({ mutationFn: (id: string) => deactivateTier(id), onSuccess: invalidate })
}

export function useReactivateTier() {
  const invalidate = useInvalidateServiceTiers()
  return useMutation({ mutationFn: (id: string) => reactivateTier(id), onSuccess: invalidate })
}

export function useArchiveTier() {
  const invalidate = useInvalidateServiceTiers()
  return useMutation({ mutationFn: (id: string) => archiveTier(id), onSuccess: invalidate })
}

export function useUnarchiveTier() {
  const invalidate = useInvalidateServiceTiers()
  return useMutation({ mutationFn: (id: string) => unarchiveTier(id), onSuccess: invalidate })
}

export function useDeleteTier() {
  const invalidate = useInvalidateServiceTiers()
  return useMutation({ mutationFn: (id: string) => deleteTier(id), onSuccess: invalidate })
}

// useAuditLogs -- S4P-22, US-071. Query key menyertakan filter supaya
// tiap kombinasi filter di-cache terpisah (ganti filter -> fetch baru,
// bukan menyaring hasil lama di klien).
export function useAuditLogs(filter: PlatformAuditLogFilter) {
  return useQuery({
    queryKey: ['platform-audit-logs', filter],
    queryFn: () => listAuditLogs(filter),
  })
}

// useHealthMetrics/useTrends/useAnomalies -- S4P-24/25/26, US-072,
// halaman "Dashboard Kesehatan Platform". staleTime pendek (bukan 0)
// supaya berpindah rentang tren bolak-balik tidak selalu refetch.
export function useHealthMetrics() {
  return useQuery({ queryKey: ['platform-health-metrics'], queryFn: () => getHealthMetrics(), staleTime: 30_000 })
}

export function useTrends(period: 7 | 30 | 90) {
  return useQuery({ queryKey: ['platform-trends', period], queryFn: () => getTrends(period), staleTime: 30_000 })
}

export function useAnomalies() {
  return useQuery({ queryKey: ['platform-anomalies'], queryFn: () => getAnomalies(), staleTime: 30_000 })
}
