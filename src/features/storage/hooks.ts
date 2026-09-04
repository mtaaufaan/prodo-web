import { useMutation, useQueryClient } from '@tanstack/react-query'

import { organizationKeys } from '@/features/organizations/hooks'

import { bulkUpdateStorageAllocation } from './api'

export function useBulkUpdateStorageAllocation(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (allocations: Record<string, number>) => bulkUpdateStorageAllocation(groupId, allocations),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  })
}
