import { describe, expect, it } from 'vitest'

import { groupByWeek, parseHours, sanitizeHours, validateLog, weekBars, weekLabel, weekStartISO } from './timesheetMath'
import type { TimesheetEntry, TimesheetTask } from './types'

describe('validateLog', () => {
  it('task wajib dipilih lebih dulu', () => {
    expect(validateLog('', '2')).toBe('Pilih task yang dikerjakan terlebih dahulu.')
  })
  it('jam harus lebih dari 0 (kosong dan nol)', () => {
    expect(validateLog('t1', '')).toBe('Jumlah jam harus lebih dari 0.')
    expect(validateLog('t1', '0')).toBe('Jumlah jam harus lebih dari 0.')
  })
  it('maksimal 12 jam; 12 sendiri masih boleh', () => {
    expect(validateLog('t1', '12.5')).toContain('Maksimal 12 jam')
    expect(validateLog('t1', '13')).toContain('Maksimal 12 jam')
    expect(validateLog('t1', '12')).toBe('')
  })
  it('format tidak valid ("2.5.3", ".") ditolak, desimal wajar diterima', () => {
    expect(validateLog('t1', '2.5.3')).toContain('Format jam tidak valid')
    expect(validateLog('t1', '.')).toContain('Format jam tidak valid')
    expect(validateLog('t1', '2.5')).toBe('')
    expect(validateLog('t1', '0.25')).toBe('')
  })
})

describe('sanitizeHours / parseHours', () => {
  it('hanya angka dan titik', () => {
    expect(sanitizeHours('2,5 jam')).toBe('25')
    expect(sanitizeHours('abc3.5x')).toBe('3.5')
  })
  it('NaN dan kosong menjadi 0', () => {
    expect(parseHours('2.5.3')).toBe(0)
    expect(parseHours('')).toBe(0)
    expect(parseHours('4')).toBe(4)
  })
})

describe('minggu', () => {
  it('weekStartISO = Senin (UTC) minggu itu', () => {
    expect(weekStartISO('2026-10-14')).toBe('2026-10-12') // Rabu
    expect(weekStartISO('2026-10-12')).toBe('2026-10-12') // Senin
    expect(weekStartISO('2026-10-18')).toBe('2026-10-12') // Minggu
    expect(weekStartISO('2026-10-19')).toBe('2026-10-19') // Senin berikutnya
  })
  it('weekLabel', () => {
    expect(weekLabel('2026-10-12')).toBe('MINGGU 12 OKT – 18 OKT 2026')
    expect(weekLabel('2026-12-28')).toBe('MINGGU 28 DES – 3 JAN 2027')
  })
  it('groupByWeek mengelompokkan, menjumlah jam, terbaru dulu', () => {
    const e = (id: string, d: string, h: number): TimesheetEntry => ({ id, task_id: 't', task_code: 'A-1', task_title: 'T', project_name: 'P', entry_date: d, hours: h, note: '' })
    const g = groupByWeek([e('1', '2026-10-14', 2), e('2', '2026-10-13', 1.5), e('3', '2026-10-06', 4)])
    expect(g.map((x) => [x.weekStart, x.totalHours, x.entries.length])).toEqual([
      ['2026-10-12', 3.5, 2],
      ['2026-10-05', 4, 1],
    ])
  })
})

describe('weekBars', () => {
  const t = (id: string, week: number, logged: number, est: number | null): TimesheetTask => ({
    task_id: id,
    task_code: id,
    title: id,
    project_id: 'p',
    project_name: 'P',
    status_name: 'IN PROGRESS',
    estimate_hours: est,
    logged_hours: logged,
    week_hours: week,
    is_active: true,
  })
  it('hanya task dengan jam minggu ini, terbanyak dulu, lebar relatif', () => {
    const bars = weekBars([t('a', 2, 5, 8), t('b', 4, 4, 8), t('c', 0, 3, 8)])
    expect(bars.map((b) => b.task.task_id)).toEqual(['b', 'a'])
    expect(bars.map((b) => b.width)).toEqual(['100%', '50%'])
  })
  it('merah bila TOTAL jam task melebihi estimasi, bukan jam minggu ini saja', () => {
    const bars = weekBars([t('a', 1, 10, 8), t('b', 3, 3, 8), t('c', 2, 20, null)])
    expect(Object.fromEntries(bars.map((b) => [b.task.task_id, b.over]))).toEqual({ a: true, b: false, c: false })
  })
})
