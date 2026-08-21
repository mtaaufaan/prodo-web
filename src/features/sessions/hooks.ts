import { queryOptions, useQuery } from '@tanstack/react-query'

import { listSessions } from './api'

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
