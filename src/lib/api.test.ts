import { describe, expect, it } from 'vitest'

import { unwrapApiResponse } from './api'

// unwrapApiResponse -- regresi untuk bug "NaNm berjalan"/timer aktif palsu
// (TaskDetailModal): { data: null } (respons sah backend saat mis. tidak
// ada timer aktif) HARUS terbuka jadi `null`, bukan tetap jadi objek
// pembungkus (yang truthy dan lolos cek `!= null` pemanggil).
describe('unwrapApiResponse', () => {
  it('membuka data: null jadi null, bukan objek pembungkus', () => {
    expect(unwrapApiResponse({ data: null })).toBeNull()
  })

  it('membuka data berisi objek', () => {
    expect(unwrapApiResponse({ data: { id: '1' } })).toEqual({ id: '1' })
  })

  it('membuka data berisi array kosong', () => {
    expect(unwrapApiResponse({ data: [] })).toEqual([])
  })

  it('mengembalikan body apa adanya kalau tidak ada field data', () => {
    expect(unwrapApiResponse({ ok: true })).toEqual({ ok: true })
  })
})
