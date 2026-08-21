import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createGroupAdmin, listGroupAdmins, resendActivation } from './api'
import type { CreateGroupAdminFormValues } from './types'

export const groupAdminKeys = {
  all: ['group-admins'] as const,
  list: () => [...groupAdminKeys.all, 'list'] as const,
}

const groupAdminListQuery = () =>
  queryOptions({
    queryKey: groupAdminKeys.list(),
    queryFn: () => listGroupAdmins(),
  })

export function useGroupAdminList() {
  return useQuery(groupAdminListQuery())
}

export function useCreateGroupAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CreateGroupAdminFormValues) => createGroupAdmin(values),
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
