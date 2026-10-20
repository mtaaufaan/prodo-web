import { describe, expect, it } from 'vitest'

import { decide, listApprovals } from './approvalsStore'

const TODAY = '2026-10-20'

describe('approvalsStore (mock Antrean Approval)', () => {
  it('antrean = UNDER REVIEW belum diputuskan; kartu menghitung seluruh task project', () => {
    const page = listApprovals('mock-proj-prodo', 'pending', 1, 10, TODAY)
    expect(page.total).toBe(3)
    expect(page.items.every((t) => t.status_name === 'UNDER REVIEW' && t.decision === null)).toBe(true)
    expect(page.stats).toEqual({ pending: 3, decided: 0, total_tasks: 4, late: 1 })
  })

  it('paginasi memotong halaman tetapi total tetap', () => {
    const p1 = listApprovals('mock-proj-quest', 'pending', 1, 10, TODAY)
    const p2 = listApprovals('mock-proj-quest', 'pending', 2, 10, TODAY)
    expect(p1.items).toHaveLength(10)
    expect(p2.items.length).toBe(p1.total - 10)
    expect(p1.total).toBe(p2.total)
  })

  it('project tanpa data -> kosong', () => {
    expect(listApprovals('tidak-ada', 'pending', 1, 10, TODAY)).toMatchObject({ total: 0, items: [], stats: { pending: 0, decided: 0, total_tasks: 0, late: 0 } })
  })

  it('TERLAMBAT: lewat due date dan belum DONE', () => {
    expect(listApprovals('mock-proj-quest', 'pending', 1, 10, '2026-10-20').stats.late).toBeGreaterThan(0)
    expect(listApprovals('mock-proj-quest', 'pending', 1, 10, '2026-01-01').stats.late).toBe(0)
  })

  it('tolak tanpa alasan >= 5 karakter ditolak server; task tak dikenal -> NOT_FOUND', () => {
    const [c] = listApprovals('mock-proj-prodo', 'pending', 1, 10, TODAY).items
    expect(decide(c.task_id, 'reject', 'abc')).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
    expect(listApprovals('mock-proj-prodo', 'pending', 1, 10, TODAY).items.map((t) => t.task_id)).toContain(c.task_id)
    expect(decide('x', 'approve', '')).toMatchObject({ ok: false, code: 'NOT_FOUND' })
  })

  // Terakhir: mengubah state modul.
  it('setuju -> DONE, masuk riwayat, hitungan turun; tolak -> IN PROGRESS; keputusan ganda ditolak', () => {
    const before = listApprovals('mock-proj-prodo', 'pending', 1, 10, TODAY)
    const [a, b] = before.items
    expect(decide(a.task_id, 'approve', '')).toMatchObject({ ok: true, result: { status_name: 'DONE', decision: 'approved' } })
    expect(decide(b.task_id, 'reject', 'Perlu diperbaiki lagi.')).toMatchObject({ ok: true, result: { status_name: 'IN PROGRESS', decision: 'rejected' } })

    const pending = listApprovals('mock-proj-prodo', 'pending', 1, 10, TODAY)
    const decided = listApprovals('mock-proj-prodo', 'decided', 1, 10, TODAY)
    expect(pending.stats.pending).toBe(before.stats.pending - 2)
    expect(decided.total).toBe(2)
    expect(decided.items.map((t) => t.decision).sort()).toEqual(['approved', 'rejected'])
    expect(decide(a.task_id, 'approve', '')).toMatchObject({ ok: false, code: 'TASK_NOT_UNDER_REVIEW' })
  })
})
