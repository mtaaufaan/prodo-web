import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import AddWorkspaceWebhookModal from '@/components/webhook/AddWorkspaceWebhookModal'
import { useWorkspace } from '@/features/workspaces/hooks'
import {
  useDeleteWorkspaceWebhook,
  useRegenerateWorkspaceWebhookSecret,
  useTestWorkspaceWebhook,
  useToggleWorkspaceWebhookActive,
  useWorkspaceWebhookDeliveries,
  useWorkspaceWebhooks,
} from '@/features/webhook/hooks'
import type { Webhook, WebhookDelivery } from '@/features/webhook/types'
import { cn } from '@/lib/utils'

const PER_PAGE_OPTIONS = [10, 20, 50]

function pageNumbers(active: number, total: number) {
  let lo = Math.max(1, active - 2)
  let hi = Math.min(total, active + 2)
  if (hi - lo < 4) {
    lo = Math.max(1, hi - 4)
    hi = Math.min(total, lo + 4)
  }
  const out: number[] = []
  for (let p = lo; p <= hi; p++) out.push(p)
  return out
}

function StatCard({ label, value, note, tone }: { label: string; value: string; note: string; tone?: 'mint' | 'destructive' | 'amber' }) {
  return (
    <div className="min-w-[130px] flex-1 border border-line bg-panel px-3.5 py-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">{label}</div>
      <div
        className={cn(
          'mt-1 text-xl font-extrabold',
          tone === 'mint' && 'text-mint',
          tone === 'destructive' && 'text-destructive',
          tone === 'amber' && 'text-amber',
        )}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[8.5px] text-text-dim">{note}</div>
    </div>
  )
}

interface EndpointRowProps {
  webhook: Webhook
  workspaceName: string
  onTest: () => void
  onToggle: () => void
  onRotate: () => void
  onDelete: () => void
  onManage: () => void
  testing: boolean
  toggling: boolean
  rotating: boolean
}

function EndpointRow({ webhook, workspaceName, onTest, onToggle, onRotate, onDelete, onManage, testing, toggling, rotating }: EndpointRowProps) {
  const total = webhook.sent_30d + webhook.failed_30d
  const failRate = total > 0 ? (webhook.failed_30d / total) * 100 : 0
  const failing = webhook.is_active && failRate >= 5
  // scope -- "Seluruh workspace" diganti nama workspace-nya (susulan,
  // dikonfirmasi user): label lama membingungkan, terbaca seolah lintas
  // SEMUA workspace/organisasi padahal isolasinya tetap per-workspace ini
  // saja (WHERE workspace_id = $1, lihat webhook_repository.go).
  const scope = webhook.project_name ? `Project ${webhook.project_name}` : `Workspace ${workspaceName}`

  return (
    <div className="flex flex-col gap-2.5 border-t border-line px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className={cn('text-[13px] font-semibold', webhook.is_active ? 'text-text-bone' : 'text-text-muted')}>{webhook.name}</div>
          <div className="mt-1 break-all font-mono text-[9px] text-text-muted">{webhook.url}</div>
          <div className="mt-1 font-mono text-[8.5px] text-text-dim">
            {scope.toUpperCase()} · DIBUAT {new Date(webhook.created_at).toLocaleDateString('id-ID')} · {total} PENGIRIMAN
          </div>
        </div>
        <span
          className={cn(
            'whitespace-nowrap border px-2 py-0.5 font-mono text-[9px] font-semibold',
            webhook.is_active ? 'border-mint text-mint' : 'border-line-strong text-text-dim',
          )}
        >
          {webhook.is_active ? 'AKTIF' : 'NONAKTIF'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {webhook.events.map((e) => (
          <span key={e} className="border border-blue/40 px-1.5 py-0.5 font-mono text-[8.5px] text-blue">
            {e}
          </span>
        ))}
      </div>
      {failing && (
        <div className="border border-destructive p-2.5 font-mono text-[9px] leading-relaxed text-destructive">
          ⚠ Kegagalan {failRate.toFixed(1)}% dalam 30 hari terakhir -- periksa tab Log Pengiriman.
        </div>
      )}
      <div className="flex flex-wrap gap-3.5">
        <button type="button" disabled={testing} onClick={onTest} className="font-mono text-[10px] text-signal hover:underline disabled:opacity-50">
          → KIRIM TES
        </button>
        <button
          type="button"
          disabled={toggling}
          onClick={onToggle}
          className={cn('font-mono text-[10px] hover:underline disabled:opacity-50', webhook.is_active ? 'text-text-muted' : 'text-mint')}
        >
          {webhook.is_active ? '⏸ NONAKTIFKAN' : '▶ AKTIFKAN'}
        </button>
        <button type="button" disabled={rotating} onClick={onRotate} className="font-mono text-[10px] text-text-muted hover:underline disabled:opacity-50">
          ↻ ROTASI SECRET
        </button>
        <button type="button" onClick={onDelete} className="font-mono text-[10px] text-destructive hover:underline">
          ⊘ HAPUS
        </button>
        <button type="button" onClick={onManage} className="ml-auto font-mono text-[10px] text-text-muted hover:text-signal hover:underline">
          ✎ Kelola
        </button>
      </div>
    </div>
  )
}

function DeliveryRow({ delivery }: { delivery: WebhookDelivery }) {
  return (
    <div className="border-t border-line px-4 py-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            'border px-1.5 py-0.5 font-mono text-[9px] font-semibold',
            delivery.status === 'delivered' ? 'border-mint text-mint' : 'border-destructive text-destructive',
          )}
        >
          HTTP {delivery.http_status ?? 'ERR'}
        </span>
        <span className="text-[12px] font-semibold text-text-bone">{delivery.webhook_name}</span>
        <span className="ml-auto whitespace-nowrap font-mono text-[9px] text-text-dim">{new Date(delivery.created_at).toLocaleString('id-ID')}</span>
      </div>
      <div className="mt-1.5 font-mono text-[9px] leading-relaxed text-text-muted">
        {delivery.event_type} · {delivery.duration_ms ?? 0} ms · PERCOBAAN KE-{delivery.attempt_number}
      </div>
      {delivery.error_message && <div className="mt-1 font-mono text-[9px] leading-relaxed text-destructive">⚠ {delivery.error_message}</div>}
    </div>
  )
}

// AwWebhookPage (S4W-14/15, US-054, desain "AW Webhook.dc.html"+"AW Add
// Webhook.dc.html") -- reuse WebhookService (Track S4G). Dua tab lewat
// WorkspaceLayout topbar (Endpoint/Log Pengiriman), BUKAN tab in-page
// seperti GroupWebhookPage.tsx (GA tidak punya sistem tab topbar). Baris
// grid Endpoint TIDAK punya aksi edit -- markup desain cuma py Kirim Tes/
// Aktifkan-Nonaktifkan/Rotasi Secret/Hapus (lihat komentar
// AddWorkspaceWebhookModal). Stat "GAGAL" dilabeli 30 HARI (bukan 7 HARI
// literal desain) -- window 30 hari sudah konvensi seluruh
// webhook_deliveries di codebase ini (retensi migrasi + ListByGroup GA),
// bukan bikin query 7-hari terpisah.
function AwWebhookPageContent() {
  const { wsId } = useParams<{ wsId: string }>()
  const workspaceId = wsId ?? ''
  const { view, registerCta } = useOutletContext<WorkspaceOutletContext>()
  const isLog = view === 'Log Pengiriman'

  const { data: workspace } = useWorkspace(workspaceId)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Webhook | null>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [logStatus, setLogStatus] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Webhook | null>(null)

  const webhooks = useWorkspaceWebhooks(workspaceId)
  const deliveries = useWorkspaceWebhookDeliveries(workspaceId, logStatus, '')
  const test = useTestWorkspaceWebhook(workspaceId)
  const toggle = useToggleWorkspaceWebhookActive(workspaceId)
  const rotate = useRegenerateWorkspaceWebhookSecret(workspaceId)
  const remove = useDeleteWorkspaceWebhook(workspaceId)

  useEffect(() => {
    registerCta(() => {
      setEditing(null)
      setAddOpen(true)
    })
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(() => webhooks.data ?? [], [webhooks.data])
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const activePage = Math.min(page, totalPages)
  const start = (activePage - 1) * perPage
  const paged = rows.slice(start, start + perPage)

  const stats = useMemo(() => {
    const activeCount = rows.filter((w) => w.is_active).length
    const problematic = rows.filter((w) => {
      const total = w.sent_30d + w.failed_30d
      return w.is_active && total > 0 && (w.failed_30d / total) * 100 >= 5
    }).length
    const failedTotal = rows.reduce((s, w) => s + w.failed_30d, 0)
    const sentTotal = rows.reduce((s, w) => s + w.sent_30d + w.failed_30d, 0)
    return { total: rows.length, active: activeCount, problematic, failedTotal, sentTotal }
  }, [rows])

  const logRows = deliveries.data ?? []

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex flex-wrap gap-3">
        <StatCard label="Endpoint" value={String(stats.total)} note="Level workspace" />
        <StatCard label="Aktif" value={String(stats.active)} note="Menerima event" tone="mint" />
        <StatCard label="Bermasalah" value={String(stats.problematic)} note="Perlu diperiksa" tone={stats.problematic > 0 ? 'destructive' : undefined} />
        <StatCard
          label="Gagal 30 Hari"
          value={String(stats.failedTotal)}
          note={`Dari ${stats.sentTotal} pengiriman`}
          tone={stats.failedTotal > 0 ? 'amber' : undefined}
        />
      </div>

      {notice && (
        <div className="relative border border-mint p-2.5 pr-8 font-mono text-[10px] leading-relaxed text-mint">
          ✓ {notice}
          <button type="button" onClick={() => setNotice(null)} className="absolute right-2 top-2 opacity-60 hover:opacity-100" title="Tutup">
            ✕
          </button>
        </div>
      )}

      {!isLog ? (
        <div className="border border-line">
          {webhooks.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
          {rows.length === 0 && !webhooks.isLoading && (
            <p className="p-6 text-center font-mono text-[10.5px] leading-relaxed text-text-muted">
              Belum ada endpoint webhook di workspace ini.
              <br />
              Gunakan + Webhook untuk menambahkan tujuan pengiriman event.
            </p>
          )}
          {paged.map((w) => (
            <EndpointRow
              key={w.id}
              webhook={w}
              workspaceName={workspace?.name ?? ''}
              testing={test.isPending}
              toggling={toggle.isPending}
              rotating={rotate.isPending}
              onTest={() =>
                test.mutate(w.id, {
                  onSuccess: (res) =>
                    setNotice(
                      res.delivered
                        ? `Payload tes dikirim ke ${w.name} -- HTTP berhasil dalam ${res.duration_ms} ms. Tercatat di tab Log Pengiriman.`
                        : `Payload tes dikirim ke ${w.name} tapi tidak berhasil (${res.duration_ms} ms). Tercatat di tab Log Pengiriman.`,
                    ),
                })
              }
              onToggle={() =>
                toggle.mutate(
                  { webhookId: w.id, active: !w.is_active },
                  { onSuccess: () => setNotice(w.is_active ? `${w.name} dinonaktifkan.` : `${w.name} diaktifkan kembali.`) },
                )
              }
              onRotate={() =>
                rotate.mutate(w.id, {
                  onSuccess: (res) => setNotice(`Signing secret ${w.name} dirotasi -- nilai baru ${res.secret}. Perbarui konfigurasi di sisi penerima, nilai penuh tidak ditampilkan lagi.`),
                })
              }
              onDelete={() => setConfirmDelete(w)}
              onManage={() => setEditing(w)}
            />
          ))}
          {rows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-line bg-raised-1 px-3.5 py-2.5">
              <span className="font-mono text-[9px] tracking-[0.06em] text-text-faint">
                {start + 1}–{Math.min(start + perPage, rows.length)} dari {rows.length} endpoint
              </span>
              <select
                value={String(perPage)}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
                className="border border-line-strong bg-input-bg px-2 py-1 font-mono text-[9px] text-text-bone outline-none"
              >
                {PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} / HAL
                  </option>
                ))}
              </select>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={activePage <= 1}
                  className="border border-line-subtle px-2.5 py-1.5 font-mono text-[10px] text-text-muted disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ◄ Sblm
                </button>
                {pageNumbers(activePage, totalPages).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={cn(
                      'min-w-[26px] border px-2 py-1.5 text-center font-mono text-[10px]',
                      p === activePage ? 'border-signal bg-signal text-bg-deep' : 'border-line-subtle text-text-muted',
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={activePage >= totalPages}
                  className="border border-line-subtle px-2.5 py-1.5 font-mono text-[10px] text-text-muted disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Brkt ►
                </button>
              </div>
            </div>
          )}
          <div className="border-t border-line bg-raised-1 px-4 py-2.5 font-mono text-[8.5px] leading-relaxed text-text-dim">
            Payload JSON ditandatangani HMAC-SHA256 pada header X-Prodo-Signature · batas 100 event/menit per organisasi · retry 3× dengan backoff 1 / 5 / 15 menit.
          </div>
        </div>
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
            <span className="ml-auto font-mono text-[9px] text-text-dim">{logRows.length} pengiriman · Retensi log 30 hari</span>
          </div>
          <div className="border border-line">
            {deliveries.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
            {logRows.length === 0 && !deliveries.isLoading && (
              <p className="p-6 text-center font-mono text-[10.5px] text-text-muted">Tidak ada pengiriman pada filter ini.</p>
            )}
            {logRows.map((d) => (
              <DeliveryRow key={d.id} delivery={d} />
            ))}
          </div>
        </>
      )}

      <AddWorkspaceWebhookModal
        open={addOpen || editing !== null}
        onClose={() => {
          setAddOpen(false)
          setEditing(null)
        }}
        workspaceId={workspaceId}
        workspaceName={workspace?.name ?? ''}
        editing={editing}
      />

      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-6">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[560px] border border-destructive bg-panel">
            <div className="border-b border-line px-5 py-4">
              <div className="font-mono text-[9px] tracking-[0.16em] text-destructive">HAPUS ENDPOINT WEBHOOK</div>
              <div className="mt-1.5 text-[15px] font-bold text-text-bone">{confirmDelete.name}</div>
            </div>
            <div className="flex flex-col gap-3.5 px-5 py-5">
              <div className="font-mono text-[10px] leading-relaxed text-text-muted">
                {confirmDelete.url} · {confirmDelete.events.length} event · {confirmDelete.sent_30d + confirmDelete.failed_30d} pengiriman tercatat.
              </div>
              <div className="font-mono text-[9.5px] leading-relaxed text-text-dim">
                Event tidak lagi dikirim ke URL ini. Riwayat pengiriman tetap tersimpan di tab Log Pengiriman sebagai audit.
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate(confirmDelete.id, {
                      onSuccess: () => {
                        setNotice(`Endpoint "${confirmDelete.name}" dihapus.`)
                        setConfirmDelete(null)
                      },
                    })
                  }
                  className="bg-destructive px-5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-white disabled:opacity-60"
                >
                  Hapus Endpoint
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="border border-line-strong px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.04em] text-text-muted"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AwWebhookPage() {
  return (
    <ErrorBoundary>
      <AwWebhookPageContent />
    </ErrorBoundary>
  )
}
