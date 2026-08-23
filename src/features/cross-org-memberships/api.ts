import { apiClient } from '@/lib/api'

import type { CrossOrgMembership } from './types'

export function listCrossOrgMemberships(groupId: string, orgId: string) {
  return apiClient.get<CrossOrgMembership[]>(`/api/v1/groups/${groupId}/cross-org-memberships`, {
    params: orgId ? { org_id: orgId } : undefined,
  })
}
