import { describe, expect, it } from 'vitest'

import { backendActionType, filterRows, fromRuleExecution, mergeFeeds } from './rows'
import type { RuleExecutionEntry, WorkspaceAuditLogEntry } from './types'

const log = (id: string, type: WorkspaceAuditLogEntry['type'], action: string, at: string): WorkspaceAuditLogEntry => ({
  id,
  actor_id: 'u1',
  actor_email: null,
  actor_display_name: 'Taufan',
  actor_role: null,
  action,
  type,
  entity_type: 'task',
  entity_id: null,
  target_name: 'Login',
  actor_ip: '10.0.0.1',
  request_path: 'PUT http://x/api',
  state_before: { status: 'BACKLOG' },
  state_after: { status: 'DONE' },
  metadata: { task_code: 'P-1' },
  logged_at: at,
})

const exec = (id: string, status: 'completed' | 'failed', at: string): RuleExecutionEntry => ({
  id,
  rule_id: 'r1',
  rule_name: 'Auto assign',
  trigger_event: { event: 'status_changed' },
  triggered_by: null,
  executed_at: at,
  status,
  action_taken: { type: 'assign' },
  error_message: status === 'failed' ? 'boom' : null,
  task_code: 'P-1',
  task_title: 'Login',
})

describe('mergeFeeds', () => {
  const logs = [log('a', 'UPDATE', 'task.status_changed', '2026-10-10T10:00:00Z'), log('b', 'ACCESS', 'audit.report_downloaded', '2026-10-12T10:00:00Z')]
  const execs = [exec('e1', 'completed', '2026-10-11T10:00:00Z')]

  it('menggabung audit + eksekusi rule, terbaru dulu', () => {
    expect(mergeFeeds(logs, execs, false).map((r) => r.id)).toEqual(['b', 'exec_e1', 'a'])
  })

  it('filter aktor aktif menyembunyikan baris rule engine', () => {
    expect(mergeFeeds(logs, execs, true).map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('baris audit memakai narasi + nilai sebelum/sesudah', () => {
    const row = mergeFeeds(logs, [], false)[1]
    expect(row.text).toBe('Status task P-1 "Login" diubah dari BACKLOG menjadi DONE')
    expect(row.before).toBe('{"status":"BACKLOG"}')
    expect(row.actorName).toBe('Taufan')
  })
})

describe('fromRuleExecution', () => {
  it('rule gagal bertipe GAGAL dengan pesan galat', () => {
    const r = fromRuleExecution(exec('e2', 'failed', '2026-10-11T10:00:00Z'))
    expect(r.type).toBe('GAGAL')
    expect(r.after).toBe('GAGAL · boom')
    expect(r.text).toBe('Rule "Auto assign" dieksekusi — Assign ke user')
  })
})

describe('filterRows', () => {
  const rows = mergeFeeds(
    [log('a', 'UPDATE', 'task.status_changed', '2026-10-10T10:00:00Z'), log('b', 'ACCESS', 'audit.report_downloaded', '2026-10-12T10:00:00Z')],
    [exec('e1', 'completed', '2026-10-11T10:00:00Z'), exec('e2', 'failed', '2026-10-09T10:00:00Z')],
    false,
  )

  it('tab Akses & Keamanan hanya ACCESS', () => {
    expect(filterRows(rows, 'Akses & Keamanan', '', '').map((r) => r.id)).toEqual(['b'])
  })

  it('tipe RULE menampilkan RULE dan GAGAL', () => {
    expect(filterRows(rows, 'Semua Aktivitas', 'RULE', '').map((r) => r.id)).toEqual(['exec_e1', 'exec_e2'])
  })

  it('pencarian bebas atas teks dan scope, tidak peka huruf besar', () => {
    expect(filterRows(rows, 'Semua Aktivitas', '', 'AUTO ASSIGN').length).toBe(2)
    expect(filterRows(rows, 'Semua Aktivitas', '', 'tidak-ada')).toEqual([])
  })
})

describe('backendActionType', () => {
  it('hanya 4 nilai asli audit_logs dikirim ke server', () => {
    expect(backendActionType('CREATE')).toBe('CREATE')
    expect(backendActionType('ACCESS')).toBe('ACCESS')
    expect(backendActionType('RULE')).toBeUndefined()
    expect(backendActionType('')).toBeUndefined()
  })
})
