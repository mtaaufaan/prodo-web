import { useQuery } from '@tanstack/react-query'

import { getGroupAuditActors, listGroupAuditLogs } from './api'
import type { GroupAuditLogFilter } from './types'

export const groupAuditKeys = {
  all: ['group-audit'] as const,
  list: (groupId: string, filter: GroupAuditLogFilter) => [...groupAuditKeys.all, 'list', groupId, filter] as const,
  actors: (groupId: string) => [...groupAuditKeys.all, 'actors', groupId] as const,
}

export function useGroupAuditLogs(groupId: string, filter: GroupAuditLogFilter) {
  return useQuery({
    queryKey: groupAuditKeys.list(groupId, filter),
    queryFn: () => listGroupAuditLogs(groupId, filter),
    enabled: groupId !== '',
  })
}

export function useGroupAuditActors(groupId: string) {
  return useQuery({
    queryKey: groupAuditKeys.actors(groupId),
    queryFn: () => getGroupAuditActors(groupId),
    enabled: groupId !== '',
  })
}
