import { useQuery } from '@tanstack/react-query'

import { getGroupAuditActors, listGroupAuditLogs } from './api'
import type { GroupAuditLogFilter } from './types'

export const groupAuditKeys = {
  all: ['group-audit'] as const,
  list: (groupId: string, filter: GroupAuditLogFilter) => [...groupAuditKeys.all, 'list', groupId, filter] as const,
  actors: (groupId: string) => [...groupAuditKeys.all, 'actors', groupId] as const,
}

// staleTime: 0 (override default global 60 detik di query-client.ts) --
// pola sama bug useAuditLogs Platform Admin (S4P-22, ditemukan user
// 2026-08-29): entri baru (login, undangan, domain, dst) tidak muncul
// kalau halaman ini dibuka <60 detik setelah fetch terakhir, karena TIDAK
// ADA mutation di file manapun yang meng-invalidate query
// 'group-audit'/'list' -- mutasinya tersebar di puluhan fitur GA (login,
// organisasi, domain, undangan, webhook, workspace, locale, dst),
// meng-invalidate satu-satu tidak praktis. Halaman audit trail memang
// harus selalu fetch ulang begitu dibuka.
export function useGroupAuditLogs(groupId: string, filter: GroupAuditLogFilter) {
  return useQuery({
    queryKey: groupAuditKeys.list(groupId, filter),
    queryFn: () => listGroupAuditLogs(groupId, filter),
    enabled: groupId !== '',
    staleTime: 0,
  })
}

export function useGroupAuditActors(groupId: string) {
  return useQuery({
    queryKey: groupAuditKeys.actors(groupId),
    queryFn: () => getGroupAuditActors(groupId),
    enabled: groupId !== '',
  })
}
