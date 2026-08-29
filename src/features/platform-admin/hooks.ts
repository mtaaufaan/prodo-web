import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  archiveTier,
  createGroupAdmin,
  createPlatformAdmin,
  createTier,
  deactivatePlatformAdmin,
  deactivateTier,
  deleteTier,
  executeErasureRequest,
  getAnomalies,
  getGroupAdmin,
  getHealthMetrics,
  getTrends,
  listAuditLogs,
  listErasureRequests,
  listGroupAdmins,
  listGroups,
  listPlatformAdmins,
  listServiceTiers,
  reactivatePlatformAdmin,
  reactivateTier,
  rejectErasureRequest,
  resendActivation,
  resetPlatformAdminMFA,
  unarchiveTier,
  updateGroupAdmin,
  updateTier,
} from './api'
import type {
  CreateGroupAdminFormValues,
  CreatePlatformAdminFormValues,
  PlatformAuditLogFilter,
  ServiceTierFormValues,
  UpdateGroupAdminFormValues,
} from './types'

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

export function useAnomalies(period: 7 | 30 | 90) {
  return useQuery({ queryKey: ['platform-anomalies', period], queryFn: () => getAnomalies(period), staleTime: 30_000 })
}

// useErasureRequests/useExecuteErasureRequest/useRejectErasureRequest --
// S4P-30/31, US-060, halaman "Right to Erasure".
const erasureRequestsKey = ['platform-erasure-requests'] as const

export function useErasureRequests() {
  return useQuery({ queryKey: erasureRequestsKey, queryFn: () => listErasureRequests() })
}

export function useExecuteErasureRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, confirmation }: { id: string; confirmation: string }) => executeErasureRequest(id, confirmation),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: erasureRequestsKey }),
  })
}

export function useRejectErasureRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rejectErasureRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: erasureRequestsKey }),
  })
}

// useGroups -- S4P-34/36, US-083. staleTime 30s: dipakai juga sebagai
// sumber picker CreateOrganizationModal, jangan refetch tiap keystroke
// modal dibuka-tutup.
export function useGroups(query: string) {
  return useQuery({ queryKey: ['platform-groups', query], queryFn: () => listGroups(query), staleTime: 30_000 })
}

// usePlatformAdmins/useCreatePlatformAdmin/useDeactivatePlatformAdmin/
// useReactivatePlatformAdmin/useResetPlatformAdminMFA -- S4P-37/38/39/40,
// US-084.
const platformAdminsKey = ['platform-admins'] as const

export function usePlatformAdmins() {
  return useQuery({ queryKey: platformAdminsKey, queryFn: () => listPlatformAdmins() })
}

export function useCreatePlatformAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CreatePlatformAdminFormValues) => createPlatformAdmin(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformAdminsKey }),
  })
}

export function useDeactivatePlatformAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivatePlatformAdmin(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformAdminsKey }),
  })
}

export function useReactivatePlatformAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reactivatePlatformAdmin(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformAdminsKey }),
  })
}

export function useResetPlatformAdminMFA() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => resetPlatformAdminMFA(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformAdminsKey }),
  })
}
