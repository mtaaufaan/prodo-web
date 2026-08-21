import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { listSessions, revokeAllSessions, revokeSession } from './api'

export const sessionKeys = {
  all: ['sessions'] as const,
  list: () => [...sessionKeys.all, 'list'] as const,
}

const sessionListQuery = () =>
  queryOptions({
    queryKey: sessionKeys.list(),
    queryFn: () => listSessions(),
  })

export function useSessionList() {
  return useQuery(sessionListQuery())
}

export function useRevokeSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (jti: string) => revokeSession(jti),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  })
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => revokeAllSessions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  })
}
