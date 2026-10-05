import { describe, expect, it } from 'vitest'

import { countRecentFailures, executionDetail, ruleSummary } from './summary'
import type { Rule, RuleExecution } from './types'

const baseRule: Rule = {
  id: 'r1',
  name: 'R',
  trigger_config: { event: 'status_changed', status_id: 's-done' },
  condition_config: null,
  action_config: { type: 'change_status', status_id: 's-canceled' },
  is_active: true,
  inactive_reason: null,
  is_template: false,
  created_by: 'u1',
  created_at: '2026-10-01T00:00:00Z',
  runs: 0,
  scope_type: 'workspace',
  scope_id: 'ws1',
  template_key: null,
  created_by_name: 'Budi',
}
const names: Record<string, string> = { 's-done': 'DONE', 's-canceled': 'CANCELED' }
const lookup = (id?: string) => (id ? names[id] : undefined)

describe('ruleSummary', () => {
  it('menyertakan status trigger dan status aksi', () => {
    const s = ruleSummary(baseRule, lookup)
    expect(s.triggerText).toBe('STATUS BERUBAH → DONE')
    expect(s.actionText).toBe('Ubah status → CANCELED')
    expect(s.conditionText).toBe('tanpa kondisi')
  })

  it('kondisi priority dan due date H-n', () => {
    const s = ruleSummary(
      { ...baseRule, trigger_config: { event: 'due_date_approaching', days: 3 }, condition_config: { type: 'priority', priority: 'critical' } },
      lookup,
    )
    expect(s.triggerText).toBe('DUE DATE H-3')
    expect(s.conditionText).toBe('Priority tertentu (critical)')
  })

  it('status tidak ditemukan -> jatuh ke label generik', () => {
    const s = ruleSummary({ ...baseRule, trigger_config: { event: 'status_changed', status_id: 'x' } }, lookup)
    expect(s.triggerText).toBe('STATUS BERUBAH')
  })
})

describe('countRecentFailures', () => {
  const now = Date.parse('2026-10-10T00:00:00Z')
  const exec = (status: RuleExecution['status'], executed_at: string): RuleExecution => ({
    id: executed_at + status,
    rule_id: 'r1',
    rule_name: 'R',
    trigger_event: {},
    triggered_by: null,
    executed_at,
    status,
    action_taken: null,
    error_message: null,
    task_code: null,
    task_title: null,
    duration_ms: null,
  })

  it('hanya gagal dalam 7 hari', () => {
    const logs = [exec('failed', '2026-10-08T00:00:00Z'), exec('failed', '2026-09-01T00:00:00Z'), exec('completed', '2026-10-09T00:00:00Z')]
    expect(countRecentFailures(logs, now)).toBe(1)
  })
})

describe('executionDetail', () => {
  const base: RuleExecution = {
    id: 'e1',
    rule_id: 'r1',
    rule_name: 'R',
    trigger_event: { event: 'status_changed' },
    triggered_by: null,
    executed_at: '2026-10-08T00:00:00Z',
    status: 'completed',
    action_taken: { type: 'change_status' },
    error_message: null,
    task_code: 'PRJ-12',
    task_title: 'Judul',
    duration_ms: 42,
  }

  it('menyusun TRIGGER · TASK · ACTION · ms', () => {
    expect(executionDetail(base)).toBe('TRIGGER STATUS TASK BERUBAH · TASK PRJ-12 · ACTION UBAH STATUS · 42 ms')
  })

  it('baris lama tanpa durasi/task tidak menampilkan ms', () => {
    expect(executionDetail({ ...base, duration_ms: null, task_code: null })).toBe('TRIGGER STATUS TASK BERUBAH · TASK - · ACTION UBAH STATUS')
  })
})
