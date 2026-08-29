import { useMemo, useRef, useState, type ReactNode } from 'react'

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
const ANOMALY_PAGE_SIZE = 10

// AnomalyRow -- baris siap-render gabungan storage + contract_end, supaya
// paginasi (dikonfirmasi user) bisa dilakukan di satu list, bukan dua
// map terpisah.
interface AnomalyRow {
  id: string
  badge: string
  badgeClassName: string
  message: ReactNode
}

function PlatformDashboardPageContent() {
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]>(30)
  const [anomalyPeriod, setAnomalyPeriod] = useState<(typeof PERIOD_OPTIONS)[number]>(7)
  const [anomalyPage, setAnomalyPage] = useState(1)
  const metrics = useHealthMetrics()
  const trends = useTrends(period)
  const anomalies = useAnomalies(anomalyPeriod)

  const tierEntries = metrics.data ? Object.entries(metrics.data.tier_distribution).sort((a, b) => b[1] - a[1]) : []
  const tierMax = tierEntries.length > 0 ? Math.max(...tierEntries.map(([, count]) => count)) : 0

  const storageAlerts = anomalies.data?.storage ?? []
  const contractAlerts = anomalies.data?.contract_end ?? []
  const totalAlerts = storageAlerts.length + contractAlerts.length

  const anomalyRows = useMemo<AnomalyRow[]>(
    () => [
      ...storageAlerts.map((a) => {
        const pct = a.quota_gb > 0 ? Math.round((a.used_mb / 1024 / a.quota_gb) * 100) : 0
        const isCritical = a.severity === 'critical'
        return {
          id: `storage-${a.group_id}`,
          badge: isCritical ? 'Storage · Kritis' : 'Storage · Peringatan',
          badgeClassName: isCritical ? 'border-red/60 text-red' : 'border-amber/60 text-amber',
          message: (
            <>
              Grup <b className="text-text-bone">{a.group_name}</b> memakai {(a.used_mb / 1024).toFixed(1)} GB dari plafon{' '}
              {a.quota_gb} GB ({pct}%).
            </>
          ),
        }
      }),
      ...contractAlerts.map((a) => {
        const daysLeft = Math.ceil((new Date(a.contract_end_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return {
          id: `contract-${a.group_id}`,
          badge: 'Kontrak',
          badgeClassName: 'border-amber/60 text-amber',
          message: (
            <>
              Grup <b className="text-text-bone">{a.group_name}</b>{' '}
              {daysLeft >= 0 ? `berakhir dalam ${daysLeft} hari` : `sudah berakhir ${Math.abs(daysLeft)} hari lalu`}.
            </>
          ),
        }
      }),
    ],
    // storageAlerts/contractAlerts adalah turunan langsung anomalies.data --
    // depend ke situ saja (referensi array ?? [] baru tiap render kalau
    // storageAlerts/contractAlerts sendiri dijadikan dep).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anomalies.data],
  )

  const totalAnomalyPages = Math.max(1, Math.ceil(anomalyRows.length / ANOMALY_PAGE_SIZE))
  const currentAnomalyPage = Math.min(anomalyPage, totalAnomalyPages)
  const pagedAnomalyRows = anomalyRows.slice(
    (currentAnomalyPage - 1) * ANOMALY_PAGE_SIZE,
    currentAnomalyPage * ANOMALY_PAGE_SIZE,
  )

  // goToAnomalyPage -- lompat langsung ke nomor halaman yang diketik
  // (dikonfirmasi user). Input non-angka diabaikan; di luar rentang
  // dibatasi ke halaman valid terdekat (1 atau totalAnomalyPages), bukan
  // ditolak dengan error -- lompat ke batas terdekat lebih masuk akal
  // untuk kontrol paging daripada memblokir aksi user.
  const anomalyPageInputRef = useRef<HTMLInputElement>(null)
  const goToAnomalyPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    setAnomalyPage(Math.min(totalAnomalyPages, Math.max(1, n)))
  }

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

      <div className="flex items-center gap-2">
        {PERIOD_OPTIONS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setAnomalyPeriod(p)
              setAnomalyPage(1)
            }}
            className={
              'border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em] ' +
              (anomalyPeriod === p ? 'border-pa-accent text-pa-accent' : 'border-line-strong text-text-muted')
            }
          >
            {p} HARI
          </button>
        ))}
      </div>

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
        {pagedAnomalyRows.map((row) => (
          <div key={row.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0">
            <span className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.04em] ${row.badgeClassName}`}>
              {row.badge}
            </span>
            <span className="flex-1 text-[12.5px] text-text-body">{row.message}</span>
          </div>
        ))}
        {anomalyRows.length > ANOMALY_PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-pa-border px-4 py-2.5">
            <button
              type="button"
              onClick={() => setAnomalyPage((p) => Math.max(1, p - 1))}
              disabled={currentAnomalyPage <= 1}
              className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted disabled:opacity-40"
            >
              ← Sebelumnya
            </button>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-dim">
              Halaman
              <input
                key={currentAnomalyPage}
                ref={anomalyPageInputRef}
                type="number"
                min={1}
                max={totalAnomalyPages}
                defaultValue={currentAnomalyPage}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') goToAnomalyPage(e.currentTarget.value)
                }}
                className="w-11 border border-line-strong bg-input-bg px-1 py-0.5 text-center font-mono text-[10px] text-text-body focus-visible:border-signal focus-visible:outline-none"
                aria-label="Nomor halaman"
              />
              / {totalAnomalyPages}
              <button
                type="button"
                onClick={() => goToAnomalyPage(anomalyPageInputRef.current?.value ?? '')}
                className="border border-line-strong px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.04em] text-text-muted"
              >
                Ke
              </button>
            </span>
            <button
              type="button"
              onClick={() => setAnomalyPage((p) => Math.min(totalAnomalyPages, p + 1))}
              disabled={currentAnomalyPage >= totalAnomalyPages}
              className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted disabled:opacity-40"
            >
              Berikutnya →
            </button>
          </div>
        )}
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
