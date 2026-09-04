import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getMyContext, switchContext } from './api'

export const contextKeys = {
  all: ['me-context'] as const,
}

export function useMyContext() {
  return useQuery({
    queryKey: contextKeys.all,
    queryFn: getMyContext,
  })
}

export function useSwitchContext() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: switchContext,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contextKeys.all }),
  })
}
