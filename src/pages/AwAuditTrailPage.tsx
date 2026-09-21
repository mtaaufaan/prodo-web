import { useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { exportWorkspaceAuditLogsCSV } from '@/features/workspace-audit/api'
import { useWorkspaceAuditActors, useWorkspaceAuditLogs, useWorkspaceRuleExecutions } from '@/features/workspace-audit/hooks'
import { formatWorkspaceAuditNarrative } from '@/features/workspace-audit/narrative'
import type { AuditActionType, RuleExecutionEntry, WorkspaceAuditLogEntry } from '@/features/workspace-audit/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10
type ViewTab = 'Semua Aktivitas' | 'Akses & Keamanan'
type FeedType = AuditActionType | 'RULE' | 'GAGAL'

const RULE_ACTION_LABELS: Record<string, string> = {
  change_status: 'Ubah status',
  notify: 'Kirim notifikasi',
  assign: 'Assign ke user',
  create_subtask: 'Buat sub-task otomatis',
}

const TYPE_TONE: Record<FeedType, string> = {
  CREATE: 'border-mint text-mint',
  UPDATE: 'border-signal text-signal',
  DELETE: 'border-destructive text-destructive',
  ACCESS: 'border-amber text-amber',
  RULE: 'border-signal text-signal',
  GAGAL: 'border-destructive text-destructive',
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

// MergedRow -- baris gabungan audit_logs + Log Eksekusi Rule Automation
// (khas AW, GA tidak punya feed kedua ini -- lihat implementation_gaps.md
// IG-86). Field disamakan dengan bentuk GroupAuditLogEntry supaya EntryRow
// bisa memakai pola grid+expand PERSIS GroupAuditTrailPage.tsx.
interface MergedRow {
  id: string
  type: FeedType
  text: string
  scope: string
  actorName: string
  actorIp: string | null
  requestPath: string | null
  before: string
  after: string
  loggedAt: string
  sortKey: number
}

function fromAuditEntry(e: WorkspaceAuditLogEntry): MergedRow {
  const { text, scope } = formatWorkspaceAuditNarrative(e)
  return {
    id: e.id,
    type: e.type,
    text,
    scope,
    actorName: e.actor_display_name ?? 'Sistem',
    actorIp: e.actor_ip,
    requestPath: e.request_path,
    before: e.state_before ? JSON.stringify(e.state_before) : '',
    after: e.state_after ? JSON.stringify(e.state_after) : '',
    loggedAt: e.logged_at,
    sortKey: new Date(e.logged_at).getTime(),
  }
}

function fromRuleExecution(e: RuleExecutionEntry): MergedRow {
  const actionType = typeof e.action_taken?.type === 'string' ? e.action_taken.type : ''
  const actionLabel = RULE_ACTION_LABELS[actionType] ?? actionType ?? '—'
  const triggerEvent = typeof e.trigger_event?.event === 'string' ? e.trigger_event.event : 'status_changed'
  return {
    id: 'exec_' + e.id,
    type: e.status === 'failed' ? 'GAGAL' : 'RULE',
    text: `Rule "${e.rule_name}" dieksekusi — ${actionLabel}`,
    scope: 'RULE · ' + (e.task_code ?? e.task_title ?? '—'),
    actorName: 'Sistem (rule engine)',
    actorIp: null,
    requestPath: 'rule engine · trigger ' + triggerEvent,
    before: `trigger ${triggerEvent}`,
    after: e.status === 'failed' ? `GAGAL${e.error_message ? ' · ' + e.error_message : ''}` : 'BERHASIL',
    loggedAt: e.executed_at,
    sortKey: new Date(e.executed_at).getTime(),
  }
}

function EntryRow({ row }: { row: MergedRow }) {
  const [expanded, setExpanded] = useState(false)
  const time = new Date(row.loggedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="border-t border-line">
      <div onClick={() => setExpanded((v) => !v)} className="grid cursor-pointer grid-cols-[0.9fr_2.1fr_0.7fr_1.1fr] items-start gap-3 px-4 py-3 hover:bg-raised-2">
        <span className="font-mono text-[9.5px] text-text-muted">{time}</span>
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cn('mt-0.5 flex-shrink-0 border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold tracking-[0.04em]', TYPE_TONE[row.type])}>{row.type}</span>
          <div className="min-w-0">
            <div className="text-[12.5px] text-text-bone">{row.text}</div>
            <div className="mt-0.5 font-mono text-[9px] text-text-muted">{row.scope}</div>
          </div>
        </div>
        <span className="truncate font-mono text-[9.5px] text-text-muted">{row.actorName}</span>
        <div className="min-w-0 font-mono text-[9px] text-text-muted">
          <div>{row.actorIp ?? '—'}</div>
          {row.requestPath && <div className="mt-0.5 break-all text-text-dim">{row.requestPath}</div>}
        </div>
      </div>
      {expanded && (
        <div className="flex flex-col gap-2.5 px-4 pb-4">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="border border-line-strong p-2.5">
              <div className="font-mono text-[8.5px] tracking-[0.1em] text-text-dim">NILAI SEBELUM</div>
              <div className="mt-1.5 whitespace-pre-wrap break-all font-mono text-[10.5px] text-destructive">{row.before || '—'}</div>
            </div>
            <div className="border border-line-strong p-2.5">
              <div className="font-mono text-[8.5px] tracking-[0.1em] text-text-dim">NILAI SESUDAH</div>
              <div className="mt-1.5 whitespace-pre-wrap break-all font-mono text-[10.5px] text-mint">{row.after || '—'}</div>
            </div>
          </div>
          <div className="break-all font-mono text-[9px] leading-relaxed text-text-dim">
            ID ENTRI {row.id.slice(0, 12)} · AKTOR {row.actorName} · IP {row.actorIp ?? '—'}
            {row.requestPath && <> · {row.requestPath}</>} · entri append-only, tidak dapat diubah
          </div>
        </div>
      )}
    </div>
  )
}

// AwAuditTrailPage (S4W-16/17, US-058). Dibangun ulang 2026-09-21 atas
// permintaan user ("untuk tampilan audit trail AW dibuat seperti audit
// trail GA") -- SEBELUMNYA mengikuti desain "AW Audit Trail.dc.html" apa
// adanya (kartu statistik, chip tipe, tanpa paginasi/filter aktor/hari,
// tab dari topbar WorkspaceLayout). Sekarang meniru struktur
// GroupAuditTrailPage.tsx PERSIS (dikonfirmasi user poin demi poin):
// grid kolom Timestamp/Aksi/Aktor/Asal, dropdown Aktor+Tipe+Hari + search
// bebas, paginasi nyata "Grid 1" (10/halaman, lompat halaman), tab
// Semua Aktivitas/Akses & Keamanan dirender di dalam halaman (BUKAN lagi
// tab topbar WorkspaceLayout -- lihat WorkspaceLayout.tsx, item nav
// 'audit' kini `tabs: null` sama seperti GroupAdminLayout). Kartu statistik
// DIHAPUS (tidak ada di GA). Satu-satunya bagian yang TETAP beda dari GA
// (tidak bisa disamakan, bukan pilihan gaya): feed gabungan dengan Log
// Eksekusi Rule Automation (tipe RULE/GAGAL) -- GA tidak punya sumber data
// kedua ini. Filter Tipe "RULE" menampilkan RULE+GAGAL sekaligus (rule
// gagal tetap bagian hasil eksekusi rule). `action_type` cuma dikirim ke
// backend untuk 4 nilai asli audit_logs (CREATE/UPDATE/DELETE/ACCESS) --
// baris rule tidak difilter server-side (endpoint terpisah, tidak kenal
// action_type), disaring di klien. Baris rule disembunyikan saat filter
// Aktor aktif (aktor rule "Sistem (rule engine)" bukan dari daftar aktor
// audit_logs, tidak relevan untuk difilter per-orang). Ekspor CSV tetap
// dibatasi ke audit_logs saja (keputusan lama, tidak diubah -- Log
// Eksekusi Rule sudah punya ekspor sendiri di halaman Rule Automation).
export default function AwAuditTrailPage() {
  const { wsId } = useParams<{ wsId: string }>()
  const workspaceId = wsId ?? ''

  const [tab, setTab] = useState<ViewTab>('Semua Aktivitas')
  const [actorId, setActorId] = useState('')
  const [actionType, setActionType] = useState('')
  const [days, setDays] = useState(30)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportNotice, setExportNotice] = useState('')
  const [exportError, setExportError] = useState('')

  const backendActionType = actionType === 'CREATE' || actionType === 'UPDATE' || actionType === 'DELETE' || actionType === 'ACCESS' ? actionType : undefined
  const filter = { actor_id: actorId || undefined, action_type: backendActionType, days }
  const logs = useWorkspaceAuditLogs(workspaceId, filter)
  const executions = useWorkspaceRuleExecutions(workspaceId)
  const actors = useWorkspaceAuditActors(workspaceId)

  const merged = useMemo(() => {
    const fromAudit = (logs.data ?? []).map(fromAuditEntry)
    // Baris rule disembunyikan kalau filter Aktor aktif -- "Sistem (rule
    // engine)" bukan salah satu aktor yang bisa dipilih di dropdown.
    const fromRules = actorId ? [] : (executions.data ?? []).map(fromRuleExecution)
    return [...fromAudit, ...fromRules].sort((a, b) => b.sortKey - a.sortKey)
  }, [logs.data, executions.data, actorId])

  const filteredEntries = useMemo(() => {
    let rows = merged
    if (tab === 'Akses & Keamanan') rows = rows.filter((r) => r.type === 'ACCESS')
    if (actionType === 'RULE') rows = rows.filter((r) => r.type === 'RULE' || r.type === 'GAGAL')
    const q = query.trim().toLowerCase()
    if (q) rows = rows.filter((r) => (r.text + ' ' + r.scope).toLowerCase().includes(q))
    return rows
  }, [merged, tab, actionType, query])

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
      const blob = await exportWorkspaceAuditLogsCSV(workspaceId, { actor_id: actorId || undefined, action_type: backendActionType, days })
      triggerDownload(blob, 'audit-trail-workspace.csv')
      setExportNotice('Audit trail workspace (audit_logs) diekspor. Log Eksekusi Rule punya ekspor CSV sendiri di halaman Rule Automation.')
    } catch {
      setExportError('Gagal mengekspor audit trail.')
    } finally {
      setExporting(false)
    }
  }

  const isLoading = logs.isLoading || executions.isLoading
  const isError = logs.isError || executions.isError

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
          <option value="RULE">RULE</option>
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
        {pagedEntries.length === 0 && !isLoading && <p className="p-4 text-sm text-text-muted">Tidak ada entri yang cocok dengan filter ini.</p>}
        {pagedEntries.map((r) => (
          <EntryRow key={r.id} row={r} />
        ))}
        <div className="flex flex-wrap gap-4 border-t border-line px-4 py-2.5 font-mono text-[8.5px] leading-relaxed text-text-dim">
          <span>🔒 Entri append-only — tidak dapat diedit atau dihapus oleh peran apa pun, termasuk Platform Admin</span>
          <span>Retensi 3 tahun</span>
          <span className="ml-auto">Cakupan: workspace ini · metadata struktural saja (isi task/komentar tidak ditampilkan)</span>
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
