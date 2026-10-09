import { describe, expect, it } from 'vitest'

import {
  buildElbowPoints,
  computeActualBar,
  ganttFocusDate,
  milestoneLabel,
  orderedSprintNames,
  parseDateOnly,
  progressPct,
  sortTasksBySprintTimeline,
} from './ganttMath'
import type { Sprint, Task, TaskStatusSession } from '@/features/tasks/types'

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

  it('canceled -- bar berhenti di tanggal masuk CANCELED', () => {
    const sessions = [
      session({ status_name: 'IN PROGRESS', entered_at: '2026-01-02T00:00:00Z', work_started_at: '2026-01-02T00:00:00Z' }),
      session({ status_name: 'CANCELED', entered_at: '2026-01-04T00:00:00Z' }),
    ]
    const r = computeActualBar({ status_name: 'CANCELED', due_date: '2026-01-15' }, sessions, null, today)
    expect(r.kind).toBe('canceled')
    expect(r.aEnd.toISOString().slice(0, 10)).toBe('2026-01-04')
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

describe('sortTasksBySprintTimeline', () => {
  const sp = (id: string, name: string, start: string | null, end: string | null) => ({ id, name, start_date: start, end_date: end }) as Sprint
  const sprints = [
    sp('s1', 'Sprint 1', '2026-10-05', '2026-10-16'),
    sp('s0', 'Sprint 0', '2026-09-28', '2026-10-05'),
    sp('sx', 'Sprint Tanpa Tanggal', null, null),
  ]
  const t = (code: string, sprintId: string | null, start: string | null, due: string | null) =>
    ({ task_code: code, sprint_id: sprintId, sprint_name: null, start_date: start, due_date: due }) as Task

  it('sprint timeline terkecil dulu, lalu task timeline terkecil di dalam sprint', () => {
    const sorted = sortTasksBySprintTimeline(
      [t('A', 's1', '2026-10-07', '2026-10-09'), t('B', 's0', '2026-10-04', '2026-10-06'), t('C', 's0', '2026-10-01', '2026-10-03'), t('D', 's1', '2026-10-06', '2026-10-08')],
      sprints,
    )
    expect(sorted.map((x) => x.task_code)).toEqual(['C', 'B', 'D', 'A'])
  })

  it('task tanpa tanggal paling akhir di sprintnya', () => {
    const sorted = sortTasksBySprintTimeline([t('U', 's0', null, null), t('A', 's0', '2026-10-01', '2026-10-02')], sprints)
    expect(sorted.map((x) => x.task_code)).toEqual(['A', 'U'])
  })

  it('sprint tanpa tanggal setelah sprint bertanggal, task tanpa sprint paling akhir', () => {
    const sorted = sortTasksBySprintTimeline(
      [t('N', null, '2026-09-01', '2026-09-02'), t('X', 'sx', '2026-09-01', '2026-09-02'), t('A', 's1', '2026-10-07', '2026-10-09')],
      sprints,
    )
    expect(sorted.map((x) => x.task_code)).toEqual(['A', 'X', 'N'])
  })

  it('seri start_date diurutkan due_date lalu kode; input tidak diubah', () => {
    const input = [t('B', 's0', '2026-10-01', '2026-10-05'), t('A', 's0', '2026-10-01', '2026-10-03'), t('C', 's0', '2026-10-01', '2026-10-03')]
    const sorted = sortTasksBySprintTimeline(input, sprints)
    expect(sorted.map((x) => x.task_code)).toEqual(['A', 'C', 'B'])
    expect(input.map((x) => x.task_code)).toEqual(['B', 'A', 'C'])
  })
})

describe('orderedSprintNames', () => {
  const sp = (name: string, start: string | null, end: string | null) => ({ id: name, name, start_date: start, end_date: end }) as Sprint
  const t = (sprintName: string | null) => ({ sprint_name: sprintName }) as Task

  it('urut menurut tanggal mulai sprint, bukan urutan kemunculan task', () => {
    const sprints = [sp('Sprint 1', '2026-10-05', '2026-10-16'), sp('Sprint 0', '2026-09-28', '2026-10-05'), sp('Sprint 2', '2026-10-19', '2026-10-30')]
    // task Sprint 1 muncul lebih dulu (kasus screenshot: tombol Sprint 1 sebelum Sprint 0)
    const tasks = [t('Sprint 1'), t('Sprint 2'), t('Sprint 0'), t('Sprint 1')]
    expect(orderedSprintNames(tasks, sprints)).toEqual(['Sprint 0', 'Sprint 1', 'Sprint 2'])
  })

  it('hanya sprint yang punya task; sprint tanpa tanggal setelah yang bertanggal', () => {
    const sprints = [sp('Tanpa Tanggal', null, null), sp('Sprint 0', '2026-09-28', null), sp('Kosong', '2026-08-01', null)]
    expect(orderedSprintNames([t('Tanpa Tanggal'), t('Sprint 0'), t(null)], sprints)).toEqual(['Sprint 0', 'Tanpa Tanggal'])
  })

  it('nama sprint tak dikenal ditaruh paling akhir', () => {
    expect(orderedSprintNames([t('Zeta'), t('Sprint 0'), t('Alfa')], [sp('Sprint 0', '2026-09-28', null)])).toEqual(['Sprint 0', 'Alfa', 'Zeta'])
  })

  it('tanpa task bersprint -> kosong', () => {
    expect(orderedSprintNames([t(null)], [sp('Sprint 0', '2026-09-28', null)])).toEqual([])
  })
})

describe('ganttFocusDate', () => {
  const sp = (name: string, start: string | null) => ({ id: name, name, start_date: start, end_date: null }) as Sprint
  const t = (sprintName: string, start: string | null) => ({ sprint_name: sprintName, start_date: start }) as Task
  const now = parseDateOnly('2026-10-10')!

  it('Semua -> hari ini', () => {
    expect(ganttFocusDate('Semua', [], [], now)).toBe(now)
  })

  it('sprint terpilih -> tanggal mulai sprint', () => {
    const d = ganttFocusDate('Sprint 1', [t('Sprint 1', '2026-10-07')], [sp('Sprint 1', '2026-10-05')], now)
    expect(d?.toISOString().slice(0, 10)).toBe('2026-10-05')
  })

  it('sprint tanpa tanggal mulai -> start_date task paling awal di sprint itu', () => {
    const d = ganttFocusDate('Sprint X', [t('Sprint X', '2026-10-09'), t('Sprint X', '2026-10-03'), t('Lain', '2026-01-01')], [sp('Sprint X', null)], now)
    expect(d?.toISOString().slice(0, 10)).toBe('2026-10-03')
  })

  it('sprint tanpa tanggal sama sekali -> null (jangan geser)', () => {
    expect(ganttFocusDate('Sprint X', [t('Sprint X', null)], [sp('Sprint X', null)], now)).toBeNull()
  })
})
