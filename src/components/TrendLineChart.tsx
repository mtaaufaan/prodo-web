import ReactECharts from 'echarts-for-react'

import type { PlatformTrendPoint } from '@/features/platform-admin/types'

// TrendLineChart -- S4P-27, US-072. Migrasi ke Apache ECharts
// (docs/tech-stack.md) 2026-08-28 -- menutup IG-22, lihat catatan
// migrasi di TierDistributionChart.tsx (chart pertama yang di-migrasi).
// SVG native dipakai sementara sejak H9 karena `npm install echarts`
// waktu itu gagal (masalah jaringan korporat intermiten, retry berhasil).
const GA_COLOR = 'oklch(0.7 0.19 45)'
const ORG_COLOR = 'oklch(0.78 0.12 165)'
const MONO_FONT = 'IBM Plex Mono, monospace'
const AXIS_LINE_COLOR = 'oklch(0.3 0.008 60)'
const SPLIT_LINE_COLOR = 'oklch(0.26 0.008 60)'
const TEXT_DIM = 'oklch(0.5 0.01 70)'
const TEXT_MUTED = 'oklch(0.62 0.01 70)'

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

export default function TrendLineChart({ points }: { points: PlatformTrendPoint[] }) {
  if (points.length === 0) return null

  const option = {
    tooltip: { trigger: 'axis' as const },
    legend: {
      data: ['GA BARU', 'ORG BARU'],
      top: 0,
      right: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: TEXT_MUTED, fontFamily: MONO_FONT, fontSize: 9.5 },
    },
    grid: { left: 30, right: 12, top: 34, bottom: 26, containLabel: false },
    xAxis: {
      type: 'category' as const,
      data: points.map((p) => formatShortDate(p.date)),
      boundaryGap: false,
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
      axisTick: { show: false },
      axisLabel: { color: TEXT_DIM, fontFamily: MONO_FONT, fontSize: 8.5, interval: Math.ceil(points.length / 8) },
    },
    yAxis: {
      type: 'value' as const,
      minInterval: 1,
      splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
      axisLine: { show: false },
      axisLabel: { color: TEXT_DIM, fontFamily: MONO_FONT, fontSize: 8 },
    },
    series: [
      {
        name: 'GA BARU',
        type: 'line' as const,
        data: points.map((p) => p.new_ga_count),
        color: GA_COLOR,
        symbol: 'none' as const,
        lineStyle: { width: 2 },
      },
      {
        name: 'ORG BARU',
        type: 'line' as const,
        data: points.map((p) => p.new_org_count),
        color: ORG_COLOR,
        symbol: 'none' as const,
        lineStyle: { width: 2 },
      },
    ],
  }

  return (
    <div className="border border-pa-border p-3">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
        Tren Registrasi GA &amp; Aktivasi Organisasi
      </div>
      <ReactECharts option={option} style={{ height: 220 }} opts={{ renderer: 'svg' }} />
    </div>
  )
}
