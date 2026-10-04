import { describe, expect, it } from 'vitest'

import { buildElbowPoints, computeActualBar, milestoneLabel, parseDateOnly, progressPct } from './ganttMath'
import type { TaskStatusSession } from '@/features/tasks/types'

function session(partial: Partial<TaskStatusSession>): TaskStatusSession {
  return {
    id: 's1',
    task_id: 't1',
    status_id: 'st1',
    status_name: 'BACKLOG',
    session_no: 1,
    entered_at: '2026-01-01T00:00:00Z',
    work_started_at: null,
    is_auto_start: false,
    exited_at: null,
    is_regression: false,
    triggered_by: null,
    ...partial,
  }
}

const today = parseDateOnly('2026-01-10')!

describe('computeActualBar', () => {
  it('todo -- task masih BACKLOG, belum pernah keluar', () => {
    const sessions = [session({ status_name: 'BACKLOG' })]
    const r = computeActualBar({ status_name: 'BACKLOG', due_date: '2026-01-15' }, sessions, null, today)
    expect(r.kind).toBe('todo')
    expect(r.aStart).toBeNull()
  })

  it('prog -- sesi IN PROGRESS dengan work_started_at', () => {
    const sessions = [
      session({ status_name: 'BACKLOG', entered_at: '2026-01-01T00:00:00Z' }),
      session({ status_name: 'IN PROGRESS', entered_at: '2026-01-02T00:00:00Z', work_started_at: '2026-01-03T00:00:00Z' }),
    ]
    const r = computeActualBar({ status_name: 'IN PROGRESS', due_date: '2026-01-15' }, sessions, null, today)
    expect(r.kind).toBe('prog')
    expect(r.aStart?.toISOString().slice(0, 10)).toBe('2026-01-03')
    // Belum lewat due date -> aEnd = due (bukan hari ini)
    expect(r.aEnd.toISOString().slice(0, 10)).toBe('2026-01-15')
  })

  it('done -- aEnd dari waktu MASUK status DONE, bukan keluar', () => {
    const sessions = [
      session({ status_name: 'IN PROGRESS', entered_at: '2026-01-02T00:00:00Z', work_started_at: '2026-01-02T00:00:00Z' }),
      session({ status_name: 'DONE', entered_at: '2026-01-05T00:00:00Z' }),
    ]
    const r = computeActualBar({ status_name: 'DONE', due_date: '2026-01-15' }, sessions, null, today)
    expect(r.kind).toBe('done')
    expect(r.aEnd.toISOString().slice(0, 10)).toBe('2026-01-05')
  })

  it('blocked -- berhenti di akhir sprint, bukan di masa depan tak terbatas', () => {
    const sessions = [
      session({ status_name: 'IN PROGRESS', entered_at: '2026-01-02T00:00:00Z', work_started_at: '2026-01-02T00:00:00Z' }),
      session({ status_name: 'BLOCKED', entered_at: '2026-01-06T00:00:00Z' }),
    ]
    const sprintEnd = parseDateOnly('2026-01-20')
    const r = computeActualBar({ status_name: 'BLOCKED', due_date: '2026-01-15' }, sessions, sprintEnd, today)
    expect(r.kind).toBe('blocked')
    expect(r.aEnd.toISOString().slice(0, 10)).toBe('2026-01-20')
  })

  it('BACKLOG/DONE auto-fill work_started_at (S4-67) TIDAK dianggap mulai mengerjakan', () => {
    // Sesi BACKLOG py work_started_at terisi (auto-fill backend), tapi status
    // sekarang masih BACKLOG -- harus tetap 'todo', bukan salah kena 'prog'.
    const sessions = [session({ status_name: 'BACKLOG', work_started_at: '2026-01-01T00:00:00Z' })]
    const r = computeActualBar({ status_name: 'BACKLOG', due_date: '2026-01-15' }, sessions, null, today)
    expect(r.kind).toBe('todo')
  })
})

describe('buildElbowPoints', () => {
  it('rute maju lurus kalau successor cukup jauh di kanan', () => {
    const pts = buildElbowPoints(0, 10, 100, 50, 9)
    expect(pts[0]).toEqual({ x: 0, y: 10 })
    expect(pts[pts.length - 1]).toEqual({ x: 100, y: 50 })
    expect(pts.length).toBe(4)
  })

  it('rute-S kalau successor terlalu dekat/di belakang predecessor', () => {
    const pts = buildElbowPoints(50, 10, 60, 50, 9)
    expect(pts[0]).toEqual({ x: 50, y: 10 })
    expect(pts[pts.length - 1]).toEqual({ x: 60, y: 50 })
    expect(pts.length).toBe(6)
  })
})

describe('milestoneLabel', () => {
  it.each([
    ['Sprint 0 - Fondation', 'M 0'],
    ['Sprint 1 · Article List', 'M 1'],
    ['Sprint 10', 'M 10'],
    ['Rilis Beta', 'RILIS BETA'],
  ])('%s -> %s', (name, want) => {
    expect(milestoneLabel(name)).toBe(want)
  })
})

describe('progressPct', () => {
  const DAY = 86400000
  const start = Date.UTC(2026, 9, 3)
  const end = Date.UTC(2026, 9, 6)

  it('jam tercatat / estimasi kalau keduanya ada', () => {
    expect(progressPct(10, 300, start, end, start)).toBe(50) // 5 jam / 10 jam
  })

  it('logged_minutes undefined (daftar task) -> rasio waktu, BUKAN NaN', () => {
    const pct = progressPct(72, undefined, start, end, start + 2 * DAY)
    expect(Number.isNaN(pct)).toBe(false)
    expect(pct).toBe(50) // 2 hari dari rentang 4 hari
  })

  it('tanpa estimasi -> rasio waktu, dijepit 5..95', () => {
    expect(progressPct(null, 0, start, end, start - 10 * DAY)).toBe(5)
    expect(progressPct(null, 0, start, end, start + 30 * DAY)).toBe(95)
  })
})
