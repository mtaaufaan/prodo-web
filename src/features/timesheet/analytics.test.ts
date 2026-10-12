import { describe, expect, it } from 'vitest'

import { accuracyRow, entryErrorMessage, fmtMinutes, initialsOf, memberRows, roleLabel, statCards, statusBarRows, toLocalInput, validateManualEntry } from './analytics'
import type { ProjectTimesheet } from './types'

const sample: ProjectTimesheet = {
  project_name: 'PRODO',
  logged_hours: 13,
  import_estimated_hours: 0,
  estimate_hours: 26,
  over_count: 2,
  over_codes: ['P-1', 'P-3'],
  members_involved: 3,
  pending_count: 1,
  by_status: [],
  tasks: [],
  members: [],
}

describe('statCards', () => {
  it('empat kartu sesuai desain', () => {
    const c = statCards(sample)
    expect(c.map((x) => x.label)).toEqual(['JAM TERCATAT', 'TOTAL ESTIMASI', 'MELEBIHI ESTIMASI', 'MEMBER TERLIBAT'])
    expect(c[0]).toMatchObject({ value: '13.0', note: 'PROJECT PRODO', tone: 'bone' })
    expect(c[1]).toMatchObject({ value: '26.0', note: '50% TERSERAP', tone: 'blue' })
    expect(c[2]).toMatchObject({ value: '2', note: 'P-1, P-3', tone: 'destructive' })
  })

  it('tanpa estimasi / tanpa yang melebihi', () => {
    const c = statCards({ ...sample, estimate_hours: 0, over_count: 0, over_codes: [] })
    expect(c[1].note).toBe('BELUM ADA')
    expect(c[2]).toMatchObject({ value: '0', note: 'TIDAK ADA', tone: 'mint' })
  })
})

describe('catatan estimasi import', () => {
  it('kartu JAM TERCATAT menyebut jam estimasi bila ada', () => {
    expect(statCards({ ...sample, import_estimated_hours: 12.5 })[0].note).toBe('PROJECT PRODO · 12.5 JAM ESTIMASI')
    expect(statCards(sample)[0].note).toBe('PROJECT PRODO')
  })

  it('baris member menandai bagian jam yang berupa estimasi', () => {
    const rows = memberRows([
      { user_id: 'a', user_name: 'A', role: 'editor', task_count: 2, hours: 8, estimate_hours: 6, active_count: 1 },
      { user_id: 'b', user_name: 'B', role: 'editor', task_count: 1, hours: 2, estimate_hours: 0, active_count: 0 },
    ])
    expect(rows[0].hoursNote).toBe('6.0 est.')
    expect(rows[1].hoursNote).toBe('')
  })
})

describe('statusBarRows', () => {
  it('lebar relatif ke status jam terbanyak; status undefined redup', () => {
    const rows = statusBarRows([
      { name: 'DONE', color_token: 'mint', is_undefined: false, hours: 8, task_count: 3 },
      { name: 'IN PROGRESS', color_token: 'signal', is_undefined: false, hours: 2, task_count: 1 },
      { name: 'X', color_token: 'grey', is_undefined: true, hours: 0, task_count: 0 },
    ])
    expect(rows.map((r) => r.widthPct)).toEqual([100, 25, 0])
    expect(rows[0]).toMatchObject({ hours: '8.0 JAM', tasks: '3 TASK', colorToken: 'mint' })
    expect(rows[2].colorToken).toBeNull()
  })

  it('semua nol tidak NaN', () => {
    expect(statusBarRows([{ name: 'A', color_token: 'grey', is_undefined: false, hours: 0, task_count: 0 }])[0].widthPct).toBe(0)
  })
})

describe('accuracyRow', () => {
  const t = (est: number, logged: number) => ({ task_code: 'P-1', title: 'T', status_name: 'DONE', estimated_hours: est, logged_hours: logged })

  it('melebihi estimasi -> merah, bar terpotong 100%', () => {
    const r = accuracyRow(t(4, 8))
    expect(r.tone).toBe('destructive')
    expect(r.delta).toBe('+100% DARI ESTIMASI')
    expect(r.widthPct).toBe(100)
    expect(r.markPct).toBe(70)
  })

  it('>= 85% -> kuning, di bawah -> hijau, nol -> belum ada jam', () => {
    expect(accuracyRow(t(10, 9)).tone).toBe('amber')
    expect(accuracyRow(t(10, 5))).toMatchObject({ tone: 'mint', delta: '50% TERPAKAI', widthPct: 35 })
    expect(accuracyRow(t(10, 0)).delta).toBe('BELUM ADA JAM')
  })

  it('meta menyebut jam tercatat, estimasi, dan status', () => {
    expect(accuracyRow(t(4, 2)).meta).toBe('2.0 JAM TERCATAT DARI 4.0 JAM ESTIMASI · DONE')
  })
})

describe('memberRows', () => {
  it('beban relatif ke member dengan task aktif terbanyak', () => {
    const rows = memberRows([
      { user_id: 'a', user_name: 'Taufan Muhammad', role: 'project_manager', task_count: 4, hours: 10, estimate_hours: 0, active_count: 5 },
      { user_id: 'b', user_name: 'Joyse', role: 'editor', task_count: 0, hours: 0, estimate_hours: 0, active_count: 3 },
      { user_id: 'c', user_name: 'Amir', role: '', task_count: 1, hours: 1, estimate_hours: 0, active_count: 1 },
    ])
    expect(rows[0]).toMatchObject({ loadPct: 100, loadTone: 'destructive', loadLabel: '5 TASK BERJALAN · BEBAN TERTINGGI', avg: '2.5 JAM', role: 'Project Manager', initials: 'TM' })
    expect(rows[1]).toMatchObject({ loadPct: 60, loadTone: 'amber', avg: '—', loadLabel: '3 TASK BERJALAN' })
    expect(rows[2]).toMatchObject({ loadPct: 20, loadTone: 'mint', role: '—' })
  })

  it('tidak ada task aktif sama sekali -> beban 0 hijau tanpa label tertinggi', () => {
    const rows = memberRows([{ user_id: 'a', user_name: 'A', role: 'editor', task_count: 1, hours: 1, estimate_hours: 0, active_count: 0 }])
    expect(rows[0]).toMatchObject({ loadPct: 0, loadTone: 'mint', loadLabel: '0 TASK BERJALAN' })
  })
})

describe('helpers', () => {
  it('initialsOf / roleLabel', () => {
    expect(initialsOf('budi.santoso@x.id')).toBe('BS')
    expect(initialsOf('')).toBe('?')
    expect(roleLabel('approver')).toBe('Approver')
    expect(roleLabel('xyz')).toBe('—')
  })

  it('entryErrorMessage memetakan kode backend', () => {
    expect(entryErrorMessage({ code: 'TIME_ENTRY_OVERLAP' }, 'x')).toContain('overlap')
    expect(entryErrorMessage({ code: 'LAIN' }, 'fallback')).toBe('fallback')
    expect(entryErrorMessage(null, 'fallback')).toBe('fallback')
  })
})

describe('format entri', () => {
  it('fmtMinutes', () => {
    expect(fmtMinutes(null)).toBe('—')
    expect(fmtMinutes(45)).toBe('45 mnt')
    expect(fmtMinutes(120)).toBe('2 jam')
    expect(fmtMinutes(135)).toBe('2 jam 15 mnt')
  })

  it('toLocalInput round-trip ke menit waktu lokal', () => {
    expect(toLocalInput(new Date(2026, 9, 12, 8, 5).toISOString())).toBe('2026-10-12T08:05')
  })
})

describe('validateManualEntry', () => {
  const now = new Date('2026-10-12T12:00:00')
  it('menolak input tidak lengkap atau tidak masuk akal', () => {
    expect(validateManualEntry('', '2026-10-12T08:00', '2026-10-12T09:00', now)).toMatch(/task/i)
    expect(validateManualEntry('t', '', '2026-10-12T09:00', now)).toMatch(/wajib/)
    expect(validateManualEntry('t', '2026-10-12T09:00', '2026-10-12T09:00', now)).toMatch(/setelah/)
    expect(validateManualEntry('t', '2026-10-13T09:00', '2026-10-13T10:00', now)).toMatch(/masa depan/)
    expect(validateManualEntry('t', '2026-10-10T08:00', '2026-10-11T09:00', now)).toMatch(/24 jam/)
  })

  it('entri valid lolos', () => {
    expect(validateManualEntry('t', '2026-10-12T08:00', '2026-10-12T09:30', now)).toBeNull()
  })
})
