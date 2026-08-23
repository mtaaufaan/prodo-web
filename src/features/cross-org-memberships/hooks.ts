import { useQuery } from '@tanstack/react-query'

import { listCrossOrgMemberships } from './api'

export function useCrossOrgMemberships(groupId: string, orgId: string) {
  return useQuery({
    queryKey: ['cross-org-memberships', groupId, orgId],
    queryFn: () => listCrossOrgMemberships(groupId, orgId),
    enabled: groupId !== '',
  })
}
