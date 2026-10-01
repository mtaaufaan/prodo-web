import { describe, expect, it } from 'vitest'

import { autoFillTaskDates } from './types'

// autoFillTaskDates -- diminta user: isi 2 dari 3 (start_date/due_date/
// estimasi jam) -> yang ketiga (kalau masih kosong) otomatis terhitung.
describe('autoFillTaskDates', () => {
  it('start_date + estimasi -> due_date terisi', () => {
    expect(autoFillTaskDates({ start_date: '2026-01-01', due_date: '', estimated_hours: '48' })).toEqual({
      due_date: '2026-01-03',
    })
  })

  it('due_date + estimasi -> start_date terisi', () => {
    expect(autoFillTaskDates({ start_date: '', due_date: '2026-01-03', estimated_hours: '48' })).toEqual({
      start_date: '2026-01-01',
    })
  })

  it('start_date + due_date -> estimasi terisi', () => {
    expect(autoFillTaskDates({ start_date: '2026-01-01', due_date: '2026-01-03', estimated_hours: '' })).toEqual({
      estimated_hours: '48',
    })
  })

  it('tidak menimpa field yang sudah terisi (ketiganya sudah ada)', () => {
    expect(autoFillTaskDates({ start_date: '2026-01-01', due_date: '2026-01-03', estimated_hours: '999' })).toEqual({})
  })

  it('cuma 1 field terisi -- belum cukup untuk menghitung apa pun', () => {
    expect(autoFillTaskDates({ start_date: '2026-01-01', due_date: '', estimated_hours: '' })).toEqual({})
  })
})
