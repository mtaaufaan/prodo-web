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

  // Ketiga field sudah terisi lalu salah satu diedit -- tetap sinkron.
  it('ubah due_date saat semua terisi -> estimasi dihitung ulang', () => {
    expect(
      autoFillTaskDates({ start_date: '2026-10-03', due_date: '2026-10-10', estimated_hours: '72' }, 'due_date'),
    ).toEqual({ estimated_hours: '168' })
  })

  it('ubah start_date saat semua terisi -> estimasi dihitung ulang', () => {
    expect(
      autoFillTaskDates({ start_date: '2026-10-05', due_date: '2026-10-06', estimated_hours: '72' }, 'start_date'),
    ).toEqual({ estimated_hours: '24' })
  })

  it('ubah estimasi saat semua terisi -> due_date digeser dari start_date', () => {
    expect(
      autoFillTaskDates({ start_date: '2026-10-03', due_date: '2026-10-06', estimated_hours: '120' }, 'estimated_hours'),
    ).toEqual({ due_date: '2026-10-08' })
  })

  it('ubah estimasi tanpa start_date -> start_date dihitung mundur dari due_date', () => {
    expect(
      autoFillTaskDates({ start_date: '', due_date: '2026-10-06', estimated_hours: '72' }, 'estimated_hours'),
    ).toEqual({ start_date: '2026-10-03' })
  })

  it('estimasi dikosongkan user tidak langsung diisi balik', () => {
    expect(
      autoFillTaskDates({ start_date: '2026-10-03', due_date: '2026-10-06', estimated_hours: '' }, 'estimated_hours'),
    ).toEqual({})
  })

  // <input type="date"> memicu onChange di tiap digit tahun yang diketik
  // (0002 -> 0020 -> 0202 -> 2026) -- tahun belum 4 digit TIDAK boleh
  // memicu auto-fill, kalau tidak tanggal turunan terkunci dengan tahun salah.
  it.each(['0002-10-05', '0020-10-05', '0202-10-05'])('tahun belum lengkap (%s) tidak memicu auto-fill', (partial) => {
    expect(autoFillTaskDates({ start_date: partial, due_date: '', estimated_hours: '48' })).toEqual({})
    expect(autoFillTaskDates({ start_date: '', due_date: partial, estimated_hours: '48' })).toEqual({})
  })
})
