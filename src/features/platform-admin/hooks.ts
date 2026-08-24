import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createGroupAdmin,
  getGroupAdmin,
  listGroupAdmins,
  listServiceTiers,
  resendActivation,
  updateGroupAdmin,
} from './api'
import type { CreateGroupAdminFormValues, UpdateGroupAdminFormValues } from './types'

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

const serviceTiersQuery = () =>
  queryOptions({
    queryKey: ['service-tiers'] as const,
    queryFn: () => listServiceTiers(),
    staleTime: 5 * 60 * 1000, // katalog tier jarang berubah
  })

export function useServiceTiers() {
  return useQuery(serviceTiersQuery())
}
