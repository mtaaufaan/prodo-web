import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import WebhookFormModal from '@/components/webhook/WebhookFormModal'
import { useOrganizationList } from '@/features/organizations/hooks'
import { useWebhookDeliveries, useWebhooks } from '@/features/webhook/hooks'
import type { Webhook, WebhookDelivery } from '@/features/webhook/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10
type ViewTab = 'Endpoint' | 'Log Pengiriman'

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'mint' | 'destructive' }) {
  return (
    <div className="min-w-[140px] flex-1 border border-line bg-panel p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">{label}</div>
      <div className={cn('mt-1.5 text-xl font-bold', tone === 'mint' && 'text-mint', tone === 'destructive' && 'text-destructive')}>{value}</div>
    </div>
  )
}

function EndpointRow({ webhook, onManage }: { webhook: Webhook; onManage: () => void }) {
  const total = webhook.sent_30d + webhook.failed_30d
  const rate = total > 0 ? Math.round((webhook.sent_30d / total) * 100) : 100
  const rateTone = rate >= 95 ? 'text-mint' : rate >= 85 ? 'text-amber' : 'text-destructive'
  return (
    <div className="grid grid-cols-[1.9fr_1fr_1.1fr_0.6fr_0.7fr] items-start gap-3 border-t border-line px-4 py-3">
      <div className="min-w-0">
        <div className="text-[12.5px] text-text-bone">{webhook.name}</div>
        <div className="mt-0.5 break-all font-mono text-[9px] text-text-muted">{webhook.url}</div>
        <div className="mt-0.5 font-mono text-[8.5px] text-text-dim">{webhook.org_name ?? 'Seluruh grup'}</div>
      </div>
      <span className="font-mono text-[9.5px] leading-relaxed text-text-muted">
        {webhook.events.length} event · {webhook.events[0]}
        {webhook.events.length > 1 ? ` +${webhook.events.length - 1}` : ''}
      </span>
      <div className="font-mono text-[9.5px] leading-relaxed">
        <div className={rateTone}>{total > 0 ? `${rate}%` : '—'}</div>
        <div className="truncate text-text-dim">{webhook.last_event_at ? new Date(webhook.last_event_at).toLocaleString('id-ID') : 'Belum ada pengiriman'}</div>
      </div>
      <span className={cn('font-mono text-[9px] font-semibold', webhook.is_active ? 'text-mint' : 'text-text-muted')}>● {webhook.is_active ? 'AKTIF' : 'NONAKTIF'}</span>
      <button type="button" onClick={onManage} className="font-mono text-[10px] text-text-muted hover:text-signal">
        ✎ Kelola
      </button>
    </div>
  )
}

function DeliveryRow({ delivery }: { delivery: WebhookDelivery }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-t border-line">
      <div onClick={() => setExpanded((v) => !v)} className="grid cursor-pointer grid-cols-[1fr_2.2fr_0.7fr_0.7fr_0.6fr] items-center gap-3 px-4 py-3 hover:bg-raised-2">
        <span className="font-mono text-[9.5px] text-text-muted">{new Date(delivery.created_at).toLocaleString('id-ID')}</span>
        <div className="min-w-0">
          <div className="font-mono text-[11px] text-text-bone">{delivery.event_type}</div>
          <div className="mt-0.5 font-mono text-[9px] text-text-dim">
            {delivery.webhook_name} · PERCOBAAN {delivery.attempt_number}
          </div>
        </div>
        <span className={cn('font-mono text-[10px] font-semibold', delivery.status === 'delivered' ? 'text-mint' : 'text-destructive')}>
          {delivery.http_status ?? 'ERR'}
        </span>
        <span className="font-mono text-[10px] text-text-muted">{delivery.duration_ms ?? 0} ms</span>
        <span className="font-mono text-[9.5px] text-text-muted">{expanded ? '▴ Tutup' : '▾ Lihat'}</span>
      </div>
      {expanded && (
        <div className="flex flex-col gap-2.5 px-4 pb-4">
          <pre className="whitespace-pre-wrap border border-line-strong p-3 font-mono text-[10px] leading-relaxed text-text-muted">
            {JSON.stringify(delivery.payload, null, 2)}
          </pre>
          {delivery.error_message && <div className="font-mono text-[9.5px] leading-relaxed text-destructive">⚠ {delivery.error_message}</div>}
          {delivery.response_body && <div className="font-mono text-[9px] leading-relaxed text-text-dim">RESPON: {delivery.response_body}</div>}
        </div>
      )}
    </div>
  )
}

// GroupWebhookPage (Track S4G, desain "GA Webhook.dc.html") -- dua tab:
// Endpoint (stats + grid webhook, sama pola Members & Roles) dan Log
// Pengiriman (filter status/webhook + grid ekspansi payload). CUMA
// menawarkan 3 event nyata -- lihat komentar WebhookFormModal.
function GroupWebhookPageContent() {
  const outletContext = useOutletContext<GroupAdminOutletContext>()
  const isBareRender = !outletContext
  const { registerCta, groupId } = outletContext ?? { registerCta: () => {}, groupId: undefined }
  const gid = isBareRender ? '' : (groupId ?? '')

  const [tab, setTab] = useState<ViewTab>('Endpoint')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Webhook | null>(null)
  const [logStatus, setLogStatus] = useState('')
  const [logWebhookId, setLogWebhookId] = useState('')

  const orgList = useOrganizationList(isBareRender ? undefined : groupId)
  const orgs = orgList.data?.organizations ?? []
  const webhooks = useWebhooks(gid)
  const deliveries = useWebhookDeliveries(gid, logStatus, logWebhookId)

  useEffect(() => {
    registerCta(() => {
      setEditing(null)
      setFormOpen(true)
    })
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(() => webhooks.data ?? [], [webhooks.data])
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const pageInputRef = useRef<HTMLInputElement>(null)
  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    setPage(Math.min(totalPages, Math.max(1, n)))
  }

  const stats = useMemo(() => {
    const activeCount = rows.filter((w) => w.is_active).length
    const failedTotal = rows.reduce((s, w) => s + w.failed_30d, 0)
    const sentTotal = rows.reduce((s, w) => s + w.sent_30d, 0)
    return { total: rows.length, active: activeCount, failed: failedTotal, sent: sentTotal }
  }, [rows])

  const logRows = deliveries.data ?? []

  return (
    <>
      <div className="space-y-3.5 p-6">
        <div className="flex gap-1.5">
          {(['Endpoint', 'Log Pengiriman'] as ViewTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'border px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em]',
                tab === t ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted hover:text-text-bone',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Endpoint' ? (
          <>
            <div className="flex flex-wrap gap-3">
              <StatCard label="Webhook Terdaftar" value={String(stats.total)} />
              <StatCard label="Aktif" value={String(stats.active)} tone="mint" />
              <StatCard label="Gagal 30 Hari" value={String(stats.failed)} tone={stats.failed > 0 ? 'destructive' : 'mint'} />
              <StatCard label="Pengiriman 30 Hari" value={stats.sent.toLocaleString('id-ID')} />
            </div>

            <div className="border border-line">
              <div className="grid grid-cols-[1.9fr_1fr_1.1fr_0.6fr_0.7fr] gap-3 border-b border-line bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                <span>Endpoint</span>
                <span>Event</span>
                <span>Sukses</span>
                <span>Status</span>
                <span>Aksi</span>
              </div>
              {webhooks.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
              {rows.length === 0 && !webhooks.isLoading && <p className="p-4 text-sm text-text-muted">Belum ada webhook terdaftar.</p>}
              {pagedRows.map((w) => (
                <EndpointRow
                  key={w.id}
                  webhook={w}
                  onManage={() => {
                    setEditing(w)
                    setFormOpen(true)
                  }}
                />
              ))}
              {rows.length > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted disabled:opacity-40"
                  >
                    ← Sblm
                  </button>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-dim">
                    Halaman
                    <input
                      key={currentPage}
                      ref={pageInputRef}
                      type="number"
                      min={1}
                      max={totalPages}
                      defaultValue={currentPage}
                      onKeyDown={(e) => e.key === 'Enter' && goToPage(e.currentTarget.value)}
                      className="w-11 border border-line-strong bg-input-bg px-1 py-0.5 text-center font-mono text-[10px] text-text-body focus-visible:border-signal focus-visible:outline-none"
                      aria-label="Nomor halaman"
                    />
                    / {totalPages} · {rows.length} data
                    <button
                      type="button"
                      onClick={() => goToPage(pageInputRef.current?.value ?? '')}
                      className="border border-line-strong px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.04em] text-text-muted"
                    >
                      Ke
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted disabled:opacity-40"
                  >
                    Brkt →
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={logStatus}
                onChange={(e) => setLogStatus(e.target.value)}
                className="border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[10px] text-text-bone outline-none"
              >
                <option value="">Semua status</option>
                <option value="delivered">Berhasil</option>
                <option value="failed">Gagal</option>
              </select>
              <select
                value={logWebhookId}
                onChange={(e) => setLogWebhookId(e.target.value)}
                className="border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[10px] text-text-bone outline-none"
              >
                <option value="">Semua webhook</option>
                {rows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <span className="ml-auto font-mono text-[9px] text-text-dim">{logRows.length} pengiriman · Retensi log 30 hari</span>
            </div>

            <div className="border border-line">
              <div className="grid grid-cols-[1fr_2.2fr_0.7fr_0.7fr_0.6fr] gap-3 border-b border-line bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                <span>Timestamp</span>
                <span>Event</span>
                <span>Respons</span>
                <span>Durasi</span>
                <span>Payload</span>
              </div>
              {deliveries.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
              {logRows.length === 0 && !deliveries.isLoading && <p className="p-4 text-sm text-text-muted">Tidak ada pengiriman yang cocok dengan filter ini.</p>}
              {logRows.map((d) => (
                <DeliveryRow key={d.id} delivery={d} />
              ))}
            </div>
            <p className="font-mono text-[8.5px] leading-relaxed text-text-dim">
              Retry otomatis 3× exponential backoff (1 · 5 · 15 menit) · Setelah seluruh retry gagal, Group Admin menerima notifikasi in-app dan email.
            </p>
          </>
        )}
      </div>

      <WebhookFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        groupId={gid}
        orgs={orgs}
        editing={editing}
      />
    </>
  )
}

export default function GroupWebhookPage() {
  return (
    <ErrorBoundary>
      <GroupWebhookPageContent />
    </ErrorBoundary>
  )
}
