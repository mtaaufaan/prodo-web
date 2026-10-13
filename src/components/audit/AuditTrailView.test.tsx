import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RuleExecutionEntry, WorkspaceAuditLogEntry } from '@/features/workspace-audit/types'

import AuditTrailView from './AuditTrailView'

const state = vi.hoisted(() => ({
  logs: [] as WorkspaceAuditLogEntry[],
  scopes: [] as unknown[],
}))

vi.mock('@/features/workspace-audit/hooks', () => ({
  useAuditLogs: (scope: unknown) => {
    state.scopes.push(scope)
    return { data: state.logs, isLoading: false, isError: false }
  },
  useAuditActors: () => ({ data: [{ id: 'u1', name: 'Taufan' }] }),
  useAuditRuleExecutions: () => ({ data: [] as RuleExecutionEntry[], isLoading: false, isError: false }),
}))
vi.mock('@/features/workspace-audit/api', () => ({ exportAuditLogsCSV: vi.fn() }))

const row = (i: number, type: WorkspaceAuditLogEntry['type'] = 'UPDATE', action = 'task.status_changed'): WorkspaceAuditLogEntry => ({
  id: `id-${i}`,
  actor_id: 'u1',
  actor_email: null,
  actor_display_name: 'Taufan',
  actor_role: null,
  action,
  type,
  entity_type: 'task',
  entity_id: null,
  target_name: `Task ${i}`,
  actor_ip: null,
  request_path: null,
  state_before: { status: 'BACKLOG' },
  state_after: { status: 'DONE' },
  metadata: { task_code: `P-${i}` },
  logged_at: `2026-10-${String(10 + (i % 10)).padStart(2, '0')}T10:00:00Z`,
})

describe('AuditTrailView', () => {
  beforeEach(() => {
    state.logs = []
    state.scopes = []
  })

  it('cakupan project: label dan peringatan baris lama tak terkait', () => {
    render(<AuditTrailView scope={{ kind: 'project', projectId: 'p1' }} />)
    expect(screen.getByText(/Cakupan: project ini/)).toBeInTheDocument()
    expect(screen.getByText(/tidak dapat dikaitkan ke project/)).toBeInTheDocument()
    expect(state.scopes[0]).toEqual({ kind: 'project', projectId: 'p1' })
  })

  it('cakupan workspace: label workspace tanpa peringatan project', () => {
    render(<AuditTrailView scope={{ kind: 'workspace', workspaceId: 'w1' }} />)
    expect(screen.getByText(/Cakupan: workspace ini/)).toBeInTheDocument()
    expect(screen.queryByText(/dikaitkan ke project/)).not.toBeInTheDocument()
  })

  it('menampilkan narasi, memaginasi 10 baris, dan tab Akses & Keamanan menyaring ACCESS', () => {
    state.logs = [...Array.from({ length: 12 }, (_, i) => row(i)), row(99, 'ACCESS', 'audit.report_downloaded')]
    render(<AuditTrailView scope={{ kind: 'project', projectId: 'p1' }} />)
    expect(screen.getByText(/13 entri/)).toBeInTheDocument()
    expect(screen.getByText(/\/ 2 · 13 data/)).toBeInTheDocument()
    expect(screen.getAllByText(/Status task P-\d+ "Task \d+" diubah dari BACKLOG menjadi DONE/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Akses & Keamanan' }))
    expect(screen.getByText(/1 entri/)).toBeInTheDocument()
    expect(screen.getByText(/Audit Trail workspace "Task 99" diekspor/)).toBeInTheDocument()
  })

  it('klik baris membuka nilai sebelum/sesudah', () => {
    state.logs = [row(1)]
    render(<AuditTrailView scope={{ kind: 'project', projectId: 'p1' }} />)
    expect(screen.queryByText('NILAI SEBELUM')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText(/Status task P-1/))
    expect(screen.getByText('NILAI SEBELUM')).toBeInTheDocument()
    expect(screen.getByText('{"status":"BACKLOG"}')).toBeInTheDocument()
  })

  it('kosong -> pesan tanpa pager', () => {
    render(<AuditTrailView scope={{ kind: 'project', projectId: 'p1' }} />)
    expect(screen.getByText(/Tidak ada entri yang cocok/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nomor halaman')).not.toBeInTheDocument()
  })
})
