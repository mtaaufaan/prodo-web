import { useQuery } from '@tanstack/react-query'

import { getAuditActors, getAuditRuleExecutions, listAuditLogs } from './api'
import type { AuditScope, WorkspaceAuditLogFilter } from './types'

function scopeKey(scope: AuditScope): string {
  return scope.kind === 'project' ? `project:${scope.projectId}` : `workspace:${scope.workspaceId}`
}

function scopeReady(scope: AuditScope): boolean {
  return (scope.kind === 'project' ? scope.projectId : scope.workspaceId) !== ''
}

export const workspaceAuditKeys = {
  all: ['workspace-audit'] as const,
  list: (scope: AuditScope, filter: WorkspaceAuditLogFilter) => [...workspaceAuditKeys.all, 'list', scopeKey(scope), filter] as const,
  actors: (scope: AuditScope) => [...workspaceAuditKeys.all, 'actors', scopeKey(scope)] as const,
  executions: (scope: AuditScope) => [...workspaceAuditKeys.all, 'executions', scopeKey(scope)] as const,
}

// staleTime: 0 -- KESALAHAN yang tidak boleh terulang (implementation_gaps.md
// IG-29, Platform Audit Trail): staleTime default global membuat entri baru
// tidak muncul kalau halaman ini dibuka <60 detik setelah aksi di menu lain,
// dan TIDAK ADA mutation di puluhan fitur workspace yang meng-invalidate
// query ini satu-satu secara praktis. Halaman audit trail SELALU fetch
// ulang begitu dibuka -- root-cause fix tunggal, pola sama useGroupAuditLogs.
// Berlaku untuk cakupan workspace DAN project (IG-130).
export function useAuditLogs(scope: AuditScope, filter: WorkspaceAuditLogFilter) {
  return useQuery({
    queryKey: workspaceAuditKeys.list(scope, filter),
    queryFn: () => listAuditLogs(scope, filter),
    enabled: scopeReady(scope),
    staleTime: 0,
  })
}

// Daftar aktor ikut staleTime 0: aktor baru muncul begitu ia melakukan aksi.
export function useAuditActors(scope: AuditScope) {
  return useQuery({
    queryKey: workspaceAuditKeys.actors(scope),
    queryFn: () => getAuditActors(scope),
    enabled: scopeReady(scope),
    staleTime: 0,
  })
}

export function useAuditRuleExecutions(scope: AuditScope) {
  return useQuery({
    queryKey: workspaceAuditKeys.executions(scope),
    queryFn: () => getAuditRuleExecutions(scope),
    enabled: scopeReady(scope),
    staleTime: 0,
  })
}
