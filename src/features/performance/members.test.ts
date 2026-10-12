import { describe, expect, it } from 'vitest'

import { hasWorkPhases, readinessCell } from './members'
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
  ...over,
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
