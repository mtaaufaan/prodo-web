import { useQuery } from '@tanstack/react-query'

import { listCrossOrgMemberships } from './api'

// staleTime: 0 (override default global 60 detik di query-client.ts) --
// sama alasan useGroupAuditLogs: data ini (project_members.is_scoped)
// dimutasi dari fitur Project Members (features/project-members/hooks.ts),
// yang cuma meng-invalidate query list-nya sendiri, TIDAK pernah
// meng-invalidate query ini -- tanpa staleTime:0, halaman ini/tab
// "Keanggotaan Lintas Organisasi" di Dashboard bisa menampilkan data basi
// kalau dibuka <60 detik setelah perubahan dari halaman lain.
export function useCrossOrgMemberships(groupId: string, orgId: string) {
  return useQuery({
    queryKey: ['cross-org-memberships', groupId, orgId],
    queryFn: () => listCrossOrgMemberships(groupId, orgId),
    enabled: groupId !== '',
    staleTime: 0,
  })
}
