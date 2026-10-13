import { formatWorkspaceAuditNarrative } from './narrative'
import type { AuditActionType, RuleExecutionEntry, WorkspaceAuditLogEntry } from './types'

export type FeedType = AuditActionType | 'RULE' | 'GAGAL'
export type ViewTab = 'Semua Aktivitas' | 'Akses & Keamanan'

// MergedRow -- baris gabungan audit_logs + Log Eksekusi Rule Automation.
// Field disamakan dengan bentuk GroupAuditLogEntry supaya baris bisa memakai
// pola grid+expand PERSIS GroupAuditTrailPage.tsx. Dipakai Audit Trail
// Workspace (AW) dan Audit Trail PM (IG-130).
export interface MergedRow {
  id: string
  type: FeedType
  text: string
  scope: string
  actorName: string
  actorIp: string | null
  requestPath: string | null
  before: string
  after: string
  loggedAt: string
  sortKey: number
}

const RULE_ACTION_LABELS: Record<string, string> = {
  change_status: 'Ubah status',
  notify: 'Kirim notifikasi',
  assign: 'Assign ke user',
  create_subtask: 'Buat sub-task otomatis',
}

export function fromAuditEntry(e: WorkspaceAuditLogEntry): MergedRow {
  const { text, scope } = formatWorkspaceAuditNarrative(e)
  return {
    id: e.id,
    type: e.type,
    text,
    scope,
    actorName: e.actor_display_name ?? 'Sistem',
    actorIp: e.actor_ip,
    requestPath: e.request_path,
    before: e.state_before ? JSON.stringify(e.state_before) : '',
    after: e.state_after ? JSON.stringify(e.state_after) : '',
    loggedAt: e.logged_at,
    sortKey: new Date(e.logged_at).getTime(),
  }
}

export function fromRuleExecution(e: RuleExecutionEntry): MergedRow {
  const actionType = typeof e.action_taken?.type === 'string' ? e.action_taken.type : ''
  const actionLabel = RULE_ACTION_LABELS[actionType] ?? actionType ?? '—'
  const triggerEvent = typeof e.trigger_event?.event === 'string' ? e.trigger_event.event : 'status_changed'
  return {
    id: 'exec_' + e.id,
    type: e.status === 'failed' ? 'GAGAL' : 'RULE',
    text: `Rule "${e.rule_name}" dieksekusi — ${actionLabel}`,
    scope: 'RULE · ' + (e.task_code ?? e.task_title ?? '—'),
    actorName: 'Sistem (rule engine)',
    actorIp: null,
    requestPath: 'rule engine · trigger ' + triggerEvent,
    before: `trigger ${triggerEvent}`,
    after: e.status === 'failed' ? `GAGAL${e.error_message ? ' · ' + e.error_message : ''}` : 'BERHASIL',
    loggedAt: e.executed_at,
    sortKey: new Date(e.executed_at).getTime(),
  }
}

// mergeFeeds -- baris rule disembunyikan kalau filter Aktor aktif ("Sistem (rule
// engine)" bukan salah satu aktor di dropdown); urut terbaru dulu.
export function mergeFeeds(logs: WorkspaceAuditLogEntry[], executions: RuleExecutionEntry[], actorFilterActive: boolean): MergedRow[] {
  const fromRules = actorFilterActive ? [] : executions.map(fromRuleExecution)
  return [...logs.map(fromAuditEntry), ...fromRules].sort((a, b) => b.sortKey - a.sortKey)
}

// filterRows -- tab "Akses & Keamanan" = hanya ACCESS; filter Tipe "RULE"
// menampilkan RULE+GAGAL sekaligus; pencarian bebas atas teks + scope.
export function filterRows(rows: MergedRow[], tab: ViewTab, actionType: string, query: string): MergedRow[] {
  let out = rows
  if (tab === 'Akses & Keamanan') out = out.filter((r) => r.type === 'ACCESS')
  if (actionType === 'RULE') out = out.filter((r) => r.type === 'RULE' || r.type === 'GAGAL')
  const q = query.trim().toLowerCase()
  if (q) out = out.filter((r) => (r.text + ' ' + r.scope).toLowerCase().includes(q))
  return out
}

// backendActionType -- hanya 4 nilai asli audit_logs yang dikirim ke server; RULE
// disaring di klien (sumber terpisah).
export function backendActionType(actionType: string): AuditActionType | undefined {
  return actionType === 'CREATE' || actionType === 'UPDATE' || actionType === 'DELETE' || actionType === 'ACCESS' ? actionType : undefined
}
