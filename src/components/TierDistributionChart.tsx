import type { GroupAdmin } from '@/features/platform-admin/types'

// S4P-10 (sisa): pie chart distribusi GA per tier di halaman Group Admin
// Mgmt. Client-side dari list.data yang sudah dimuat -- tidak ada endpoint
// agregat baru, konsisten dengan halaman ini yang sudah tidak paginasi
// (jumlah GA diharapkan kecil, lihat komentar api.ts). Tier custom (S4P-11)
// membuat nama tier dinamis -- warna 3 tier standar tetap (starter/
// business/enterprise, cocok dengan design "PA Group Admins"), tier
// custom lain mengambil dari palet cadangan berdasar urutan kemunculan.
//
// ponytail: docs/tech-stack.md menetapkan Apache ECharts untuk seluruh
// chart di app, tapi `npm install echarts` gagal berulang kali di mesin
// ini (ECONNRESET ke registry.npmjs.org -- masalah jaringan lokal, bukan
// keputusan arsitektur). Donut SVG native dipakai sebagai gantinya untuk
// H6 ini, tanpa dependency baru. Ganti ke ECharts begitu npm install
// berhasil ATAU begitu chart pertama yang butuh interaktivitas sungguhan
// (Gantt/Workload, S5+) mulai dikerjakan -- jangan biarkan substitusi ini
// jadi pola permanen untuk chart lain.
const STANDARD_TIER_COLOR: Record<string, string> = {
  enterprise: 'oklch(0.78 0.12 165)',
  business: 'oklch(0.72 0.15 25)',
  starter: 'oklch(0.55 0.01 70)',
}

// Palet cadangan untuk tier custom (S4P-11), token warna status yang
// sudah ada (docs/design.md) -- dipakai berurutan, ulang kalau tier
// custom lebih banyak dari palet.
const CUSTOM_TIER_PALETTE = ['oklch(0.78 0.16 75)', 'oklch(0.72 0.15 320)', 'oklch(0.72 0.12 240)']

function colorForTier(name: string, customIndex: number): string {
  return STANDARD_TIER_COLOR[name.toLowerCase()] ?? CUSTOM_TIER_PALETTE[customIndex % CUSTOM_TIER_PALETTE.length]
}

// Dipisah dari komponen supaya bisa di-unit-test tanpa render SVG.
// eslint-disable-next-line react-refresh/only-export-components -- fungsi murni, ditest terpisah dari komponen
export function aggregateByTier(groupAdmins: GroupAdmin[]): Record<string, number> {
  return groupAdmins.reduce<Record<string, number>>((acc, ga) => {
    if (!ga.tier) return acc
    acc[ga.tier] = (acc[ga.tier] ?? 0) + 1
    return acc
  }, {})
}

const SIZE = 120
const STROKE = 22
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function TierDistributionChart({ groupAdmins }: { groupAdmins: GroupAdmin[] }) {
  const counts = aggregateByTier(groupAdmins)
  const tiers = Object.keys(counts)
  const total = tiers.reduce((sum, tier) => sum + counts[tier], 0)

  if (total === 0) return null

  let offset = 0
  let customIndex = 0
  const segments = tiers.map((tier) => {
    const value = counts[tier]
    const length = (value / total) * CIRCUMFERENCE
    const isStandard = tier.toLowerCase() in STANDARD_TIER_COLOR
    const color = colorForTier(tier, isStandard ? 0 : customIndex++)
    const segment = { tier, value, length, offset, color }
    offset += length
    return segment
  })

  return (
    <div className="border border-pa-border p-3">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
        Distribusi Tier
      </div>
      <div className="flex items-center gap-4">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Distribusi Group Admin per tier">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="oklch(0.26 0.008 60)"
            strokeWidth={STROKE}
          />
          {segments.map(({ tier, length, offset: segOffset, color }) => (
            <circle
              key={tier}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-segOffset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          ))}
          <text
            x={SIZE / 2}
            y={SIZE / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-text-bone font-mono text-[18px] font-semibold"
          >
            {total}
          </text>
        </svg>
        <div className="flex flex-col gap-1.5">
          {segments.map(({ tier, value, color }) => (
            <div key={tier} className="flex items-center gap-2 font-mono text-[10.5px]">
              <span className="inline-block h-2.5 w-2.5" style={{ backgroundColor: color }} />
              <span className="text-text-muted">{tier.toUpperCase()}</span>
              <span className="text-text-bone">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
