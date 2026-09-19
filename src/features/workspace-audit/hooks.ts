import { useQuery } from '@tanstack/react-query'

import { getWorkspaceAuditActors, getWorkspaceRuleExecutions, listWorkspaceAuditLogs } from './api'
import type { WorkspaceAuditLogFilter } from './types'

export const workspaceAuditKeys = {
  all: ['workspace-audit'] as const,
  list: (workspaceId: string, filter: WorkspaceAuditLogFilter) => [...workspaceAuditKeys.all, 'list', workspaceId, filter] as const,
  actors: (workspaceId: string) => [...workspaceAuditKeys.all, 'actors', workspaceId] as const,
  executions: (workspaceId: string) => [...workspaceAuditKeys.all, 'executions', workspaceId] as const,
}

// staleTime: 0 -- KESALAHAN yang tidak boleh terulang (implementation_gaps.md
// IG-29, Platform Audit Trail): staleTime default global membuat entri baru
// tidak muncul kalau halaman ini dibuka <60 detik setelah aksi di menu lain,
// dan TIDAK ADA mutation di puluhan fitur workspace yang meng-invalidate
// query ini satu-satu secara praktis. Halaman audit trail SELALU fetch
// ulang begitu dibuka -- root-cause fix tunggal, pola sama useGroupAuditLogs.
export function useWorkspaceAuditLogs(workspaceId: string, filter: WorkspaceAuditLogFilter) {
  return useQuery({
    queryKey: workspaceAuditKeys.list(workspaceId, filter),
    queryFn: () => listWorkspaceAuditLogs(workspaceId, filter),
    enabled: workspaceId !== '',
    staleTime: 0,
  })
}

export function useWorkspaceAuditActors(workspaceId: string) {
  return useQuery({
    queryKey: workspaceAuditKeys.actors(workspaceId),
    queryFn: () => getWorkspaceAuditActors(workspaceId),
    enabled: workspaceId !== '',
  })
}

export function useWorkspaceRuleExecutions(workspaceId: string) {
  return useQuery({
    queryKey: workspaceAuditKeys.executions(workspaceId),
    queryFn: () => getWorkspaceRuleExecutions(workspaceId),
    enabled: workspaceId !== '',
    staleTime: 0,
  })
}
