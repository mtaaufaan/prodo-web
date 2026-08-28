import { useState } from 'react'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import TrendLineChart from '@/components/TrendLineChart'
import { useAnomalies, useHealthMetrics, useTrends } from '@/features/platform-admin/hooks'

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 GB'
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`
  return `${gb.toFixed(1)} GB`
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-pa-border p-4">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-1 font-mono text-[9.5px] text-text-muted">{sub}</div>}
    </div>
  )
}

const PERIOD_OPTIONS = [7, 30, 90] as const

function PlatformDashboardPageContent() {
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]>(30)
  const metrics = useHealthMetrics()
  const trends = useTrends(period)
  const anomalies = useAnomalies()

  const tierEntries = metrics.data ? Object.entries(metrics.data.tier_distribution).sort((a, b) => b[1] - a[1]) : []
  const tierMax = tierEntries.length > 0 ? Math.max(...tierEntries.map(([, count]) => count)) : 0

  const storageAlerts = anomalies.data?.storage ?? []
  const contractAlerts = anomalies.data?.contract_end ?? []
  const totalAlerts = storageAlerts.length + contractAlerts.length

  return (
    <div className="space-y-3.5 p-6">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
          Kesehatan Platform · Realtime
        </div>
        <div className="mt-1.5 text-base font-bold">Ringkasan lintas seluruh Group Admin dan organisasi</div>
      </div>

      {metrics.isLoading && <p className="font-mono text-sm text-text-muted">Memuat...</p>}
      {metrics.isError && <p className="font-mono text-sm text-destructive">Gagal memuat health metrics.</p>}

      {metrics.data && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Group Admin Aktif" value={metrics.data.active_ga_count.toLocaleString('id-ID')} />
          <MetricCard label="Organisasi Aktif" value={metrics.data.active_org_count.toLocaleString('id-ID')} />
          <MetricCard label="Total Storage Terpakai" value={formatBytes(metrics.data.total_storage_used_bytes)} />
          <div className="border border-pa-border p-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Distribusi Tier</div>
            <div className="mt-2.5 flex flex-col gap-1.5">
              {tierEntries.length === 0 && <span className="font-mono text-[10.5px] text-text-muted">Belum ada grup.</span>}
              {tierEntries.map(([name, count]) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-16 flex-shrink-0 font-mono text-[9.5px] text-text-muted">{name.toUpperCase()}</span>
                  <span className="h-2 flex-1 bg-line">
                    <span
                      className="block h-full bg-pa-accent"
                      style={{ width: tierMax > 0 ? `${(count / tierMax) * 100}%` : '0%' }}
                    />
                  </span>
                  <span className="w-6 flex-shrink-0 text-right font-mono text-[10px] text-text-bone">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {PERIOD_OPTIONS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={
              'border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em] ' +
              (period === p ? 'border-pa-accent text-pa-accent' : 'border-line-strong text-text-muted')
            }
          >
            {p} HARI
          </button>
        ))}
      </div>

      {trends.isLoading && <p className="font-mono text-sm text-text-muted">Memuat tren...</p>}
      {trends.isError && <p className="font-mono text-sm text-destructive">Gagal memuat tren.</p>}
      {trends.data && <TrendLineChart points={trends.data} />}

      <div className="border border-pa-border">
        <div className="flex items-center justify-between border-b border-pa-border px-4 py-2.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Alert Anomali</span>
          <span className="font-mono text-[10px] text-text-muted">{totalAlerts} kejadian</span>
        </div>
        {anomalies.isLoading && <p className="p-4 font-mono text-sm text-text-muted">Memuat...</p>}
        {anomalies.isError && <p className="p-4 font-mono text-sm text-destructive">Gagal memuat anomali.</p>}
        {anomalies.data && totalAlerts === 0 && (
          <p className="p-4 font-mono text-[11px] text-text-muted">Tidak ada anomali terdeteksi saat ini.</p>
        )}
        {storageAlerts.map((a) => (
          <div key={a.group_id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0">
            <span className="border border-red/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.04em] text-red">
              Storage
            </span>
            <span className="flex-1 text-[12.5px] text-text-body">
              Grup <b className="text-text-bone">{a.group_name}</b> memakai {(a.used_mb / 1024).toFixed(1)} GB dari plafon {a.quota_gb} GB.
            </span>
          </div>
        ))}
        {contractAlerts.map((a) => {
          const daysLeft = Math.ceil((new Date(a.contract_end_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          return (
            <div key={a.org_id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0">
              <span className="border border-amber/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.04em] text-amber">
                Kontrak
              </span>
              <span className="flex-1 text-[12.5px] text-text-body">
                Organisasi <b className="text-text-bone">{a.org_name}</b> (grup {a.group_name}){' '}
                {daysLeft >= 0 ? `berakhir dalam ${daysLeft} hari` : `sudah berakhir ${Math.abs(daysLeft)} hari lalu`}.
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PlatformDashboardPage() {
  return (
    <ErrorBoundary>
      <PlatformDashboardPageContent />
    </ErrorBoundary>
  )
}
