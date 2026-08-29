import ReactECharts from 'echarts-for-react'
import { useTranslation } from 'react-i18next'

import type { GroupAdmin } from '@/features/platform-admin/types'

// S4P-10 (sisa): pie chart distribusi GA per tier di halaman Group Admin
// Mgmt. Client-side dari list.data yang sudah dimuat -- tidak ada endpoint
// agregat baru, konsisten dengan halaman ini yang sudah tidak paginasi
// (jumlah GA diharapkan kecil, lihat komentar api.ts). Tier custom (S4P-11)
// membuat nama tier dinamis -- warna 3 tier standar tetap (starter/
// business/enterprise, cocok dengan design "PA Group Admins"), tier
// custom lain mengambil dari palet cadangan berdasar urutan kemunculan.
//
// Migrasi ke Apache ECharts (docs/tech-stack.md) 2026-08-28 -- menutup
// IG-22. Donut SVG native dipakai sementara sejak H6 karena
// `npm install echarts` gagal berulang kali (ECONNRESET, masalah
// jaringan korporat yang ternyata intermiten -- retry hari ini berhasil).
// Renderer 'svg' (bukan default canvas) dipakai supaya warna oklch()
// diproses lewat parser CSS yang sama dengan elemen SVG lain di app ini,
// bukan Canvas2D fillStyle yang dukungan oklch()-nya kurang teruji.
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

// Dipisah dari komponen supaya bisa di-unit-test tanpa render chart.
// eslint-disable-next-line react-refresh/only-export-components -- fungsi murni, ditest terpisah dari komponen
export function aggregateByTier(groupAdmins: GroupAdmin[]): Record<string, number> {
  return groupAdmins.reduce<Record<string, number>>((acc, ga) => {
    if (!ga.tier) return acc
    acc[ga.tier] = (acc[ga.tier] ?? 0) + 1
    return acc
  }, {})
}

const MONO_FONT = 'IBM Plex Mono, monospace'
const TEXT_MUTED = 'oklch(0.62 0.01 70)'
const TEXT_BONE = 'oklch(0.93 0.01 80)'

export default function TierDistributionChart({ groupAdmins }: { groupAdmins: GroupAdmin[] }) {
  const { t } = useTranslation()
  const counts = aggregateByTier(groupAdmins)
  const tiers = Object.keys(counts)
  const total = tiers.reduce((sum, tier) => sum + counts[tier], 0)

  if (total === 0) return null

  let customIndex = 0
  const data = tiers.map((tier) => {
    const isStandard = tier.toLowerCase() in STANDARD_TIER_COLOR
    const color = colorForTier(tier, isStandard ? 0 : customIndex++)
    return { name: tier.toUpperCase(), value: counts[tier], itemStyle: { color } }
  })

  const option = {
    tooltip: {
      trigger: 'item' as const,
      valueFormatter: (v: number) => t('tierDistributionChart.tooltipUnit', { count: v }),
    },
    legend: {
      orient: 'vertical' as const,
      right: 0,
      top: 'center' as const,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: TEXT_MUTED, fontFamily: MONO_FONT, fontSize: 10.5 },
    },
    series: [
      {
        type: 'pie' as const,
        radius: ['48%', '78%'],
        center: ['32%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        data,
      },
    ],
    graphic: {
      elements: [
        {
          type: 'text' as const,
          left: '26%',
          top: 'center' as const,
          style: { text: String(total), fill: TEXT_BONE, fontSize: 18, fontWeight: 600, fontFamily: MONO_FONT },
        },
      ],
    },
  }

  return (
    <div className="border border-pa-border p-3">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
        {t('tierDistributionChart.title')}
      </div>
      <ReactECharts option={option} style={{ height: 130 }} opts={{ renderer: 'svg' }} />
    </div>
  )
}
