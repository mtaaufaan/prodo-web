import type { BottleneckStat } from './types'

export type BottleneckMode = 'total' | 'queue'
export type BottleneckTag = 'BOTTLENECK' | 'WASPADA' | 'SEHAT'

// Aturan label Bottleneck Detection. Bottleneck = tahap yang membuat pekerjaan
// MENUNGGU (antrean dominan), bukan sekadar tahap yang lama -- tahap kerja yang
// memang besar tidak boleh dilabeli bottleneck. Label tidak lagi otomatis
// jatuh ke peringkat pertama: alur yang sehat boleh tidak punya bottleneck.
export const BOTTLENECK_RULES = {
  minSessions: 5, // data terlalu sedikit = tidak dilabeli
  minHours: 24, // di bawah 1 hari tidak cukup berarti
  ratio: 1.5, // minimal 1,5x rata-rata status lain
  minQueueShare: 0.5, // BOTTLENECK: >= 50% waktunya adalah antrean
  watchQueueShare: 0.3, // WASPADA: >= 30% antrean
  watchFraction: 0.6, // WASPADA: >= 60% dari nilai terburuk
} as const

export function bottleneckValue(row: BottleneckStat, mode: BottleneckMode): number {
  return mode === 'queue' ? row.avg_queue_hours : row.avg_total_hours
}

function queueShare(row: BottleneckStat): number {
  return row.avg_total_hours > 0 ? row.avg_queue_hours / row.avg_total_hours : 0
}

// classifyBottlenecks -- label per nama status. BACKLOG sudah dikeluarkan
// backend (bukan tahap kerja, lihat UMUR BACKLOG).
export function classifyBottlenecks(rows: BottleneckStat[], mode: BottleneckMode): Record<string, BottleneckTag> {
  const tags: Record<string, BottleneckTag> = {}
  if (rows.length === 0) return tags

  const R = BOTTLENECK_RULES
  const max = Math.max(...rows.map((r) => bottleneckValue(r, mode)))
  const top = rows.find((r) => bottleneckValue(r, mode) === max)

  for (const r of rows) {
    const v = bottleneckValue(r, mode)
    const enough = r.session_count >= R.minSessions && v >= R.minHours
    let tag: BottleneckTag = 'SEHAT'
    if (r === top && enough && queueShare(r) >= R.minQueueShare && rows.length > 1) {
      const others = rows.filter((x) => x !== r)
      const othersMean = others.reduce((sum, x) => sum + bottleneckValue(x, mode), 0) / others.length
      if (v >= othersMean * R.ratio) tag = 'BOTTLENECK'
    }
    if (tag !== 'BOTTLENECK' && enough && queueShare(r) >= R.watchQueueShare && v >= max * R.watchFraction) tag = 'WASPADA'
    tags[r.status_name] = tag
  }
  return tags
}
