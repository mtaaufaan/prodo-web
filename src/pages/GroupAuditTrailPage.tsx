import { useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useGroupAuditActors, useGroupAuditLogs } from '@/features/group-audit/hooks'
import { exportGroupAuditLogsCSV } from '@/features/group-audit/api'
import { formatGroupAuditNarrative } from '@/features/group-audit/narrative'
import type { AuditActionType, GroupAuditLogEntry } from '@/features/group-audit/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10
type ViewTab = 'Semua Aktivitas' | 'Akses & Keamanan'

const TYPE_TONE: Record<AuditActionType, string> = {
  CREATE: 'border-mint text-mint',
  UPDATE: 'border-signal text-signal',
  DELETE: 'border-destructive text-destructive',
  ACCESS: 'border-amber text-amber',
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function EntryRow({ entry }: { entry: GroupAuditLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const { text, scope } = formatGroupAuditNarrative(entry)
  const time = new Date(entry.logged_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="border-t border-line">
      <div onClick={() => setExpanded((v) => !v)} className="grid cursor-pointer grid-cols-[1fr_2.4fr_0.9fr_0.6fr] items-start gap-3 px-4 py-3 hover:bg-raised-2">
        <span className="font-mono text-[9.5px] text-text-muted">{time}</span>
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cn('mt-0.5 flex-shrink-0 border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold tracking-[0.04em]', TYPE_TONE[entry.type])}>{entry.type}</span>
          <div className="min-w-0">
            <div className="text-[12.5px] text-text-bone">{text}</div>
            <div className="mt-0.5 font-mono text-[9px] text-text-muted">{scope}</div>
          </div>
        </div>
        <span className="truncate font-mono text-[9.5px] text-text-muted">{entry.actor_display_name ?? 'Sistem'}</span>
        <span className="truncate font-mono text-[9px] text-text-muted">{entry.actor_ip ?? '—'}</span>
      </div>
      {expanded && (
        <div className="flex flex-col gap-2.5 px-4 pb-4">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="border border-line-strong p-2.5">
              <div className="font-mono text-[8.5px] tracking-[0.1em] text-text-dim">NILAI SEBELUM</div>
              <div className="mt-1.5 whitespace-pre-wrap break-all font-mono text-[10.5px] text-destructive">
                {entry.state_before ? JSON.stringify(entry.state_before) : '—'}
              </div>
            </div>
            <div className="border border-line-strong p-2.5">
              <div className="font-mono text-[8.5px] tracking-[0.1em] text-text-dim">NILAI SESUDAH</div>
              <div className="mt-1.5 whitespace-pre-wrap break-all font-mono text-[10.5px] text-mint">
                {entry.state_after ? JSON.stringify(entry.state_after) : '—'}
              </div>
            </div>
          </div>
          <div className="break-all font-mono text-[9px] leading-relaxed text-text-dim">
            ID ENTRI {entry.id.slice(0, 8)} · AKTOR ID {entry.actor_id?.slice(0, 8) ?? '—'} · IP {entry.actor_ip ?? '—'}
            {typeof entry.metadata?.request_path === 'string' && <> · {entry.metadata.request_path}</>}
          </div>
        </div>
      )}
    </div>
  )
}

// GroupAuditTrailPage (Track S4G, desain "GA Audit Trail.dc.html") --
// READ-ONLY di atas audit_logs yang sudah ada, lihat implementation_gaps.md
// IG-45. Tab "Akses & Keamanan" (tipe ACCESS) sengaja akan selalu kosong --
// tidak ada kode yang menulis audit entry login/sesi di level mana pun.
// Ekspor CSV sinkron (unduh langsung), bukan tautan email 72 jam seperti
// mockup -- baris audit murni teks, tidak butuh job async (IG-45).
function GroupAuditTrailPageContent() {
  const outletContext = useOutletContext<GroupAdminOutletContext>()
  const isBareRender = !outletContext
  const { groupId } = outletContext ?? { groupId: undefined }
  const gid = isBareRender ? '' : (groupId ?? '')

  const [tab, setTab] = useState<ViewTab>('Semua Aktivitas')
  const [actorId, setActorId] = useState('')
  const [actionType, setActionType] = useState('')
  const [days, setDays] = useState(30)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const filter = { actor_id: actorId || undefined, action_type: actionType || undefined, days }
  const logs = useGroupAuditLogs(gid, filter)
  const actors = useGroupAuditActors(gid)

  const filteredEntries = useMemo(() => {
    let rows = logs.data ?? []
    if (tab === 'Akses & Keamanan') rows = rows.filter((e) => e.type === 'ACCESS')
    const q = query.trim().toLowerCase()
    if (q) {
      rows = rows.filter((e) => {
        const { text, scope } = formatGroupAuditNarrative(e)
        return (text + ' ' + scope).toLowerCase().includes(q)
      })
    }
    return rows
  }, [logs.data, tab, query])

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const pageInputRef = useRef<HTMLInputElement>(null)
  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    setPage(Math.min(totalPages, Math.max(1, n)))
  }

  const handleExport = async () => {
    setExporting(true)
    setExportError('')
    try {
      const blob = await exportGroupAuditLogsCSV(gid, filter)
      triggerDownload(blob, 'audit-trail.csv')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RATE_LIMITED') {
        const retryAfter = (err.details as { retry_after?: number } | undefined)?.retry_after
        setExportError(`Batas ekspor audit trail terlampaui (maks 3 permintaan/menit).${retryAfter ? ` Coba lagi dalam ${retryAfter} detik.` : ''}`)
      } else {
        setExportError('Gagal mengekspor audit trail.')
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {(['Semua Aktivitas', 'Akses & Keamanan'] as ViewTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t)
                setPage(1)
              }}
              className={cn(
                'border px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em]',
                tab === t ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted hover:text-text-bone',
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="bg-signal px-3.5 py-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-bg-deep disabled:opacity-50"
        >
          {exporting ? 'Mengekspor...' : 'Ekspor CSV'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={actorId}
          onChange={(e) => {
            setActorId(e.target.value)
            setPage(1)
          }}
          className="border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[10px] text-text-bone outline-none"
        >
          <option value="">Semua aktor</option>
          {(actors.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={actionType}
          onChange={(e) => {
            setActionType(e.target.value)
            setPage(1)
          }}
          className="border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[10px] text-text-bone outline-none"
        >
          <option value="">Semua aksi</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="ACCESS">ACCESS</option>
        </select>
        <select
          value={days}
          onChange={(e) => {
            setDays(Number(e.target.value))
            setPage(1)
          }}
          className="border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[10px] text-text-bone outline-none"
        >
          <option value={7}>7 hari terakhir</option>
          <option value={30}>30 hari terakhir</option>
          <option value={90}>90 hari terakhir</option>
          <option value={0}>Semua (3 tahun)</option>
        </select>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          placeholder="Cari objek atau nilai…"
          className="min-w-[150px] max-w-[260px] flex-1 border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[10px] text-text-bone outline-none focus-visible:border-signal"
        />
        <span className="ml-auto whitespace-nowrap font-mono text-[9px] text-text-dim">{filteredEntries.length} entri · urut terbaru</span>
      </div>

      {exportError && <p className="font-mono text-[10.5px] text-destructive">⚠ {exportError}</p>}

      <div className="border border-line">
        <div className="grid grid-cols-[1fr_2.4fr_0.9fr_0.6fr] gap-3 border-b border-line bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
          <span>Timestamp</span>
          <span>Aksi</span>
          <span>Aktor</span>
          <span>Asal</span>
        </div>
        {logs.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
        {logs.isError && <p className="p-4 text-sm text-destructive">Gagal memuat audit trail.</p>}
        {pagedEntries.length === 0 && !logs.isLoading && <p className="p-4 text-sm text-text-muted">Tidak ada entri yang cocok dengan filter ini.</p>}
        {pagedEntries.map((e) => (
          <EntryRow key={e.id} entry={e} />
        ))}
        <div className="flex flex-wrap gap-4 border-t border-line px-4 py-2.5 font-mono text-[8.5px] leading-relaxed text-text-dim">
          <span>🔒 Entri immutable — tidak dapat diedit atau dihapus oleh siapa pun</span>
          <span>Retensi 3 tahun</span>
          <span className="ml-auto">Cakupan: seluruh organisasi dalam grup · metadata struktural saja</span>
        </div>
        {filteredEntries.length > PAGE_SIZE && (
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
              / {totalPages} · {filteredEntries.length} data
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
    </div>
  )
}

export default function GroupAuditTrailPage() {
  return (
    <ErrorBoundary>
      <GroupAuditTrailPageContent />
    </ErrorBoundary>
  )
}
