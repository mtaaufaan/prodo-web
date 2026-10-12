import { describe, expect, it } from 'vitest'

import { ackCell, hasWorkPhases, readinessCell } from './members'
import type { MemberStat } from './types'

const member = (over: Partial<MemberStat>): MemberStat => ({
  user_id: 'u1',
  user_name: 'Daniel',
  active_by_priority: {},
  total_count: 0,
  done_count: 0,
  completion_rate_raw: 0,
  completion_rate_weighted: 0,
  avg_completion_hours: null,
  ack_avg_hours: null,
  ack_pending_count: 0,
  readiness_count: 0,
  readiness_avg_hours: null,
  readiness_preparing: 0,
  readiness_reopens: 0,
  ack_unconfirmed_count: 0,
  ...over,
})

describe('ackCell', () => {
  it('ada acknowledge: rata-rata jeda berwarna menurut ambang, pending tampil di catatan', () => {
    expect(ackCell(member({ ack_avg_hours: 6, ack_pending_count: 1 }))).toEqual({ value: '6.0 jam', tone: 'mint', note: '1 pending' })
    expect(ackCell(member({ ack_avg_hours: 18 })).tone).toBe('amber')
    expect(ackCell(member({ ack_avg_hours: 30 })).tone).toBe('destructive')
  })

  it('belum ada acknowledge tapi ada fase aktif menunggu -> "N pending"', () => {
    expect(ackCell(member({ ack_pending_count: 2 }))).toEqual({ value: '2 pending', tone: 'amber', note: '' })
  })

  it('hanya fase lama tanpa acknowledge -> bukan pending, tampil sebagai tidak dikonfirmasi', () => {
    expect(ackCell(member({ ack_unconfirmed_count: 6 }))).toEqual({ value: '—', tone: 'dim', note: '6 tidak dikonfirmasi' })
  })

  it('tidak ada data -> kosong', () => {
    expect(ackCell(member({}))).toEqual({ value: '—', tone: 'dim', note: '' })
  })
})

describe('members', () => {
  it('hasWorkPhases: hanya bila pernah memegang fase kerja', () => {
    expect(hasWorkPhases(member({ total_count: 0 }))).toBe(false)
    expect(hasWorkPhases(member({ total_count: 3 }))).toBe(true)
  })

  it('readinessCell: null bila bukan PIC backlog yang dinilai', () => {
    expect(readinessCell(member({}))).toBeNull()
  })

  it('readinessCell: rata-rata + jumlah siap, disiapkan, dibuka lagi', () => {
    expect(readinessCell(member({ readiness_count: 4, readiness_avg_hours: 42, readiness_preparing: 1, readiness_reopens: 1 }))).toEqual({
      value: '1.8 hari',
      note: '4 task siap · 1 sedang disiapkan · 1× dibuka lagi',
    })
  })

  it('readinessCell: hanya sedang disiapkan -> nilai kosong, catatan tetap tampil', () => {
    expect(readinessCell(member({ readiness_preparing: 2 }))).toEqual({ value: '—', note: '2 sedang disiapkan' })
  })
})
