import type { PlatformTrendPoint } from '@/features/platform-admin/types'

// TrendLineChart -- S4P-27, US-072. SVG native (bukan Apache ECharts) --
// pola sama dan alasan sama dengan TierDistributionChart.tsx (IG-22):
// `npm install echarts` masih gagal di mesin ini (masalah jaringan, bukan
// keputusan arsitektur). Ganti ke ECharts begitu install berhasil ATAU
// begitu chart pertama yang benar-benar butuh interaktivitas ECharts
// mulai dikerjakan (Gantt/Workload, S5+).
const WIDTH = 640
const HEIGHT = 200
const PAD_LEFT = 32
const PAD_BOTTOM = 24
const PAD_TOP = 12
const PAD_RIGHT = 12

const GA_COLOR = 'oklch(0.7 0.19 45)'
const ORG_COLOR = 'oklch(0.78 0.12 165)'

function pathFor(points: PlatformTrendPoint[], key: 'new_ga_count' | 'new_org_count', max: number): string {
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0
  return points
    .map((p, i) => {
      const x = PAD_LEFT + i * stepX
      const y = PAD_TOP + plotH - (max > 0 ? (p[key] / max) * plotH : 0)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

export default function TrendLineChart({ points }: { points: PlatformTrendPoint[] }) {
  if (points.length === 0) return null

  const max = Math.max(1, ...points.map((p) => Math.max(p.new_ga_count, p.new_org_count)))
  const gaPath = pathFor(points, 'new_ga_count', max)
  const orgPath = pathFor(points, 'new_org_count', max)
  const first = points[0]
  const last = points[points.length - 1]

  return (
    <div className="border border-pa-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
          Tren Registrasi GA &amp; Aktivasi Organisasi
        </div>
        <div className="flex gap-3 font-mono text-[9.5px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: GA_COLOR }} />
            <span className="text-text-muted">GA BARU</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ORG_COLOR }} />
            <span className="text-text-muted">ORG BARU</span>
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Tren registrasi Group Admin dan aktivasi organisasi">
        {[0, 0.5, 1].map((f) => {
          const y = PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) * f
          return <line key={f} x1={PAD_LEFT} y1={y} x2={WIDTH - PAD_RIGHT} y2={y} stroke="oklch(0.26 0.008 60)" strokeWidth={1} />
        })}
        <text x={PAD_LEFT - 6} y={PAD_TOP + 4} textAnchor="end" className="fill-text-dim font-mono text-[8px]">
          {max}
        </text>
        <text x={PAD_LEFT - 6} y={HEIGHT - PAD_BOTTOM} textAnchor="end" className="fill-text-dim font-mono text-[8px]">
          0
        </text>
        <path d={orgPath} fill="none" stroke={ORG_COLOR} strokeWidth={2} />
        <path d={gaPath} fill="none" stroke={GA_COLOR} strokeWidth={2} />
        <text x={PAD_LEFT} y={HEIGHT - 6} className="fill-text-dim font-mono text-[8.5px]">
          {formatShortDate(first.date)}
        </text>
        <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 6} textAnchor="end" className="fill-text-dim font-mono text-[8.5px]">
          {formatShortDate(last.date)}
        </text>
      </svg>
    </div>
  )
}
