import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getGroupLocale, updateGroupLocale } from './api'
import type { GroupLocaleFormValues } from './types'

export const groupLocaleKeys = {
  all: ['group-locale'] as const,
  detail: (groupId: string) => [...groupLocaleKeys.all, groupId] as const,
}

export function useGroupLocale(groupId: string) {
  return useQuery({
    queryKey: groupLocaleKeys.detail(groupId),
    queryFn: () => getGroupLocale(groupId),
    enabled: groupId !== '',
  })
}

export function useUpdateGroupLocale(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: GroupLocaleFormValues) => updateGroupLocale(groupId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupLocaleKeys.detail(groupId) }),
  })
}
