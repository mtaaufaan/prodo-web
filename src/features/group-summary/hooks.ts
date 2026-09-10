import { useQuery } from '@tanstack/react-query'

import { getGroupSummary } from './api'

export const groupSummaryKeys = {
  all: ['group-summary'] as const,
  detail: (groupId: string) => [...groupSummaryKeys.all, groupId] as const,
}

export function useGroupSummary(groupId: string) {
  return useQuery({
    queryKey: groupSummaryKeys.detail(groupId),
    queryFn: () => getGroupSummary(groupId),
    enabled: groupId !== '',
  })
}
