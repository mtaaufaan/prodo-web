import { describe, expect, it } from 'vitest'

import { classifyBottlenecks } from './bottleneck'
import type { BottleneckStat } from './types'

const row = (status_name: string, total: number, queue: number, sessions = 10): BottleneckStat => ({
  status_name,
  avg_total_hours: total,
  avg_queue_hours: queue,
  avg_active_hours: total - queue,
  session_count: sessions,
})

describe('classifyBottlenecks', () => {
  it('kosong -> tidak ada label', () => {
    expect(classifyBottlenecks([], 'total')).toEqual({})
  })

  it('antrean dominan dan jauh di atas status lain -> BOTTLENECK', () => {
    const tags = classifyBottlenecks([row('UNDER REVIEW', 80, 72), row('IN PROGRESS', 30, 3)], 'total')
    expect(tags['UNDER REVIEW']).toBe('BOTTLENECK')
    expect(tags['IN PROGRESS']).toBe('SEHAT')
  })

  it('tahap kerja yang lama tanpa antrean (kasus data impor PRODO) bukan bottleneck', () => {
    const tags = classifyBottlenecks([row('IN PROGRESS', 65, 0, 43), row('UNDER REVIEW', 0, 0, 43)], 'total')
    expect(tags['IN PROGRESS']).toBe('SEHAT')
    expect(Object.values(tags)).not.toContain('BOTTLENECK')
  })

  it('data kurang dari 5 sesi tidak dilabeli', () => {
    const tags = classifyBottlenecks([row('UNDER REVIEW', 80, 72, 3), row('IN PROGRESS', 30, 3)], 'total')
    expect(tags['UNDER REVIEW']).toBe('SEHAT')
  })

  it('di bawah 1 hari tidak dilabeli', () => {
    const tags = classifyBottlenecks([row('UNDER REVIEW', 20, 18), row('IN PROGRESS', 2, 0)], 'total')
    expect(tags['UNDER REVIEW']).toBe('SEHAT')
  })

  it('hanya satu status -> tidak bisa dibandingkan, bukan BOTTLENECK', () => {
    const tags = classifyBottlenecks([row('UNDER REVIEW', 80, 72)], 'total')
    expect(tags['UNDER REVIEW']).not.toBe('BOTTLENECK')
  })

  it('tertinggi tapi kurang dari 1,5x rata-rata status lain -> WASPADA', () => {
    const tags = classifyBottlenecks([row('UNDER REVIEW', 50, 40), row('IN PROGRESS', 40, 30), row('QA', 40, 30)], 'total')
    expect(tags['UNDER REVIEW']).toBe('WASPADA')
  })

  it('mode queue memakai waktu antre', () => {
    const rows = [row('IN PROGRESS', 100, 10), row('UNDER REVIEW', 60, 50)]
    expect(classifyBottlenecks(rows, 'total')['IN PROGRESS']).toBe('SEHAT') // total tertinggi tapi antrean kecil
    expect(classifyBottlenecks(rows, 'queue')['UNDER REVIEW']).toBe('BOTTLENECK')
  })
})
