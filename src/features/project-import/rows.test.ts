import { describe, expect, it } from 'vitest'

import { sprintRowNote, sprintRowTitle } from './rows'
import type { SprintImportRow } from './types'

const base: SprintImportRow = { row: 2, code: 'SPR-01', name: 'Sprint 1', sprint_status: 'done', status: 'valid' }

describe('sprintRowNote', () => {
  it('baris valid: status + rentang tanggal', () => {
    expect(sprintRowNote({ ...base, start_date: '2026-10-01', end_date: '2026-10-14' })).toBe('STATUS DONE · 01/10/2026 → 14/10/2026')
  })
  it('baris valid tanpa tanggal: hanya status', () => {
    expect(sprintRowNote(base)).toBe('STATUS DONE')
  })
  it('baris dilewati: alasan', () => {
    expect(sprintRowNote({ ...base, status: 'skipped', reason: 'Code sudah dipakai' })).toBe('Code sudah dipakai')
  })
})

describe('sprintRowTitle', () => {
  it('valid: kode · nama', () => {
    expect(sprintRowTitle(base)).toBe('SPR-01 · Sprint 1')
  })
  it('dilewati: menyebut nomor baris', () => {
    expect(sprintRowTitle({ ...base, row: 14, code: '', name: '', status: 'skipped' })).toBe('Baris 14 — (kosong)')
    expect(sprintRowTitle({ ...base, row: 5, name: '', status: 'skipped' })).toBe('Baris 5 — SPR-01')
  })
})
