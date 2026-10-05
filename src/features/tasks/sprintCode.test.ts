import { describe, expect, it } from 'vitest'

import { formatSprintCode, isValidSprintCode, nextSprintNumber, normalizeSprintCode } from './sprintCode'

describe('nextSprintNumber', () => {
  it('belum ada sprint -> null (penomoran harus dipilih)', () => {
    expect(nextSprintNumber([])).toBeNull()
  })
  it('increment dari angka terbesar, SPR-00 -> 1', () => {
    expect(nextSprintNumber(['SPR-00'])).toBe(1)
    expect(nextSprintNumber(['SPR-01', 'SPR-02', 'SPR-07'])).toBe(8)
  })
  it('kode kustom diabaikan', () => {
    expect(nextSprintNumber(['ALPHA', 'spr-03'])).toBe(4)
    expect(nextSprintNumber(['ALPHA'])).toBe(1)
  })
})

describe('kode sprint', () => {
  it('format dua digit, tiga digit tidak terpotong', () => {
    expect(formatSprintCode(0)).toBe('SPR-00')
    expect(formatSprintCode(7)).toBe('SPR-07')
    expect(formatSprintCode(123)).toBe('SPR-123')
  })
  it('normalisasi dan validasi', () => {
    expect(normalizeSprintCode(' spr-9 ')).toBe('SPR-9')
    expect(isValidSprintCode('SPR-01')).toBe(true)
    expect(isValidSprintCode('SPR 01')).toBe(false)
    expect(isValidSprintCode('A'.repeat(21))).toBe(false)
  })
})
