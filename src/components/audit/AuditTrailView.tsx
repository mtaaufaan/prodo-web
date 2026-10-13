import { useMemo, useState } from 'react'

import AuditEntryRow from '@/components/audit/AuditEntryRow'
import Grid1Pager from '@/components/shared/Grid1Pager'
import { exportAuditLogsCSV } from '@/features/workspace-audit/api'
import { useAuditActors, useAuditLogs, useAuditRuleExecutions } from '@/features/workspace-audit/hooks'
import { backendActionType, filterRows, mergeFeeds, type ViewTab } from '@/features/workspace-audit/rows'
import type { AuditScope } from '@/features/workspace-audit/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10
const TABS: ViewTab[] = ['Semua Aktivitas', 'Akses & Keamanan']
const SELECT = 'border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[10px] text-text-bone outline-none'

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

// AuditTrailView -- Audit Trail untuk cakupan WORKSPACE (Admin Workspace, S4W-16/17,
// US-058) dan PROJECT (Project Manager, IG-130): desain "AW Audit Trail.dc.html"
// dipakai bersama kedua role (Master UI User, showAudit). Dibangun mengikuti
// GroupAuditTrailPage.tsx PERSIS (dikonfirmasi user 2026-09-21): grid kolom
// Timestamp/Aksi/Aktor/Asal, dropdown Aktor+Tipe+Hari + search bebas, paginasi
// "Grid 1" (Grid1Pager), tab Semua Aktivitas/Akses & Keamanan di DALAM halaman,
// TANPA kartu statistik. Satu-satunya beda dari GA: feed gabungan dengan Log
// Eksekusi Rule Automation (tipe RULE/GAGAL). `action_type` cuma dikirim ke
// backend untuk 4 nilai asli audit_logs; baris rule disaring di klien dan
// disembunyikan saat filter Aktor aktif. Ekspor CSV hanya audit_logs (Log
// Eksekusi Rule punya ekspor sendiri di halaman Rule Automation) dan aksi
// ekspor itu sendiri dicatat di audit trail (ACCESS).
export default function AuditTrailView({ scope }: { scope: AuditScope }) {
  const [tab, setTab] = useState<ViewTab>('Semua Aktivitas')
  const [actorId, setActorId] = useState('')
  const [actionType, setActionType] = useState('')
  const [days, setDays] = useState(30)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportNotice, setExportNotice] = useState('')
  const [exportError, setExportError] = useState('')

  const filter = { actor_id: actorId || undefined, action_type: backendActionType(actionType), days }
  const logs = useAuditLogs(scope, filter)
  const executions = useAuditRuleExecutions(scope)
  const actors = useAuditActors(scope)

  const merged = useMemo(() => mergeFeeds(logs.data ?? [], executions.data ?? [], actorId !== ''), [logs.data, executions.data, actorId])
  const rows = useMemo(() => filterRows(merged, tab, actionType, query), [merged, tab, actionType, query])
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const label = scope.kind === 'project' ? 'project' : 'workspace'
  const handleExport = async () => {
    setExporting(true)
    setExportError('')
    setExportNotice('')
    try {
      const blob = await exportAuditLogsCSV(scope, filter)
      triggerDownload(blob, `audit-trail-${label}.csv`)
      setExportNotice(`Audit trail ${label} (audit_logs) diekspor — aksi ekspor ini juga dicatat. Log Eksekusi Rule punya ekspor CSV sendiri di halaman Rule Automation.`)
    } catch {
      setExportError('Gagal mengekspor audit trail.')
    } finally {
      setExporting(false)
    }
  }

  const reset = (apply: () => void) => {
    apply()
    setPage(1)
  }
  const isLoading = logs.isLoading || executions.isLoading
  const isError = logs.isError || executions.isError

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => reset(() => setTab(t))}
              className={cn('border px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em]', tab === t ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted hover:text-text-bone')}
            >
              {t}
            </button>
          ))}
        </div>
        <button type="button" onClick={handleExport} disabled={exporting} className="bg-signal px-3.5 py-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-bg-deep disabled:opacity-50">
          {exporting ? 'Mengekspor...' : 'Ekspor CSV'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={actorId} onChange={(e) => reset(() => setActorId(e.target.value))} className={SELECT} aria-label="Filter aktor">
          <option value="">Semua aktor</option>
          {(actors.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select value={actionType} onChange={(e) => reset(() => setActionType(e.target.value))} className={SELECT} aria-label="Filter aksi">
          <option value="">Semua aksi</option>
          {['CREATE', 'UPDATE', 'DELETE', 'ACCESS', 'RULE'].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={days} onChange={(e) => reset(() => setDays(Number(e.target.value)))} className={SELECT} aria-label="Filter rentang hari">
          <option value={7}>7 hari terakhir</option>
          <option value={30}>30 hari terakhir</option>
          <option value={90}>90 hari terakhir</option>
          <option value={0}>Semua (3 tahun)</option>
        </select>
        <input
          value={query}
          onChange={(e) => reset(() => setQuery(e.target.value))}
          placeholder="Cari objek atau nilai…"
          className="min-w-[150px] max-w-[260px] flex-1 border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[10px] text-text-bone outline-none focus-visible:border-signal"
        />
        <span className="ml-auto whitespace-nowrap font-mono text-[9px] text-text-dim">{rows.length} entri · urut terbaru</span>
      </div>

      {exportNotice && <p className="font-mono text-[10.5px] text-mint">✓ {exportNotice}</p>}
      {exportError && <p className="font-mono text-[10.5px] text-destructive">⚠ {exportError}</p>}

      <div className="border border-line">
        <div className="grid grid-cols-[0.9fr_2.1fr_0.7fr_1.1fr] gap-3 border-b border-line bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
          <span>Timestamp</span>
          <span>Aksi</span>
          <span>Aktor</span>
          <span>Asal</span>
        </div>
        {isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
        {isError && <p className="p-4 text-sm text-destructive">Gagal memuat audit trail.</p>}
        {paged.length === 0 && !isLoading && <p className="p-4 text-sm text-text-muted">Tidak ada entri yang cocok dengan filter ini.</p>}
        {paged.map((r) => (
          <AuditEntryRow key={r.id} row={r} />
        ))}
        <div className="flex flex-wrap gap-4 border-t border-line px-4 py-2.5 font-mono text-[8.5px] leading-relaxed text-text-dim">
          <span>🔒 Entri append-only — tidak dapat diedit atau dihapus oleh peran apa pun, termasuk Platform Admin</span>
          <span>Retensi 3 tahun</span>
          <span className="ml-auto">
            Cakupan: {label} ini · metadata struktural saja (isi task/komentar tidak ditampilkan)
            {scope.kind === 'project' && ' · aktivitas yang tercatat sebelum penanda project ditambahkan dan entitasnya sudah dihapus tidak dapat dikaitkan ke project'}
          </span>
        </div>
        <Grid1Pager page={currentPage} perPage={PAGE_SIZE} total={rows.length} onPage={setPage} />
      </div>
    </div>
  )
}
