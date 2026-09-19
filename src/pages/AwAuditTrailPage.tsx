import { useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import { exportWorkspaceAuditLogsCSV } from '@/features/workspace-audit/api'
import { useWorkspaceAuditLogs, useWorkspaceRuleExecutions } from '@/features/workspace-audit/hooks'
import { formatWorkspaceAuditNarrative } from '@/features/workspace-audit/narrative'
import type { RuleExecutionEntry, WorkspaceAuditLogEntry } from '@/features/workspace-audit/types'
import { cn } from '@/lib/utils'

const RULE_ACTION_LABELS: Record<string, string> = {
  change_status: 'Ubah status',
  notify: 'Kirim notifikasi',
  assign: 'Assign ke user',
  create_subtask: 'Buat sub-task otomatis',
}

type FeedType = 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS' | 'RULE' | 'GAGAL'
const TYPE_FILTERS: Array<'Semua' | FeedType> = ['Semua', 'CREATE', 'UPDATE', 'DELETE', 'ACCESS', 'RULE']

const TYPE_CLASS: Record<FeedType, string> = {
  CREATE: 'text-mint border-mint',
  UPDATE: 'text-signal border-signal',
  DELETE: 'text-destructive border-destructive',
  ACCESS: 'text-amber border-amber',
  RULE: 'text-signal border-signal',
  GAGAL: 'text-destructive border-destructive',
}

// MergedRow -- baris gabungan audit_logs + Log Eksekusi Rule Automation,
// pola PERSIS desain "AW Audit Trail.dc.html" (this.state.audit.concat(
// fromRules)). "device" di forensik desain TIDAK diikutkan -- backend
// tidak pernah merekam user-agent (kolom itu tidak ada di audit_logs sama
// sekali), diganti request_path yang justru lebih berguna untuk admin.
interface MergedRow {
  id: string
  type: FeedType
  text: string
  scope: string
  actor: string
  source: string
  before: string
  after: string
  stamp: string
  sortKey: number
  forensics: string
}

function fromAuditEntry(e: WorkspaceAuditLogEntry): MergedRow {
  const { text, scope } = formatWorkspaceAuditNarrative(e)
  return {
    id: e.id,
    type: e.type,
    text,
    scope,
    actor: e.actor_display_name ?? 'Sistem',
    source: e.request_path?.startsWith('POST') || e.request_path?.startsWith('PUT') || e.request_path?.startsWith('DELETE') ? 'API' : 'UI',
    before: e.state_before ? JSON.stringify(e.state_before) : '—',
    after: e.state_after ? JSON.stringify(e.state_after) : '—',
    stamp: new Date(e.logged_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
    sortKey: new Date(e.logged_at).getTime(),
    forensics: `ID ${e.id} · IP ${e.actor_ip ?? '—'} · ${e.request_path ?? '—'} · entri append-only, tidak dapat diubah`,
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
    actor: 'Sistem (rule engine)',
    source: 'SISTEM',
    before: `trigger ${triggerEvent}`,
    after: e.status === 'failed' ? `GAGAL${e.error_message ? ' · ' + e.error_message : ''}` : 'BERHASIL',
    stamp: new Date(e.executed_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
    sortKey: new Date(e.executed_at).getTime(),
    forensics: `ID ${e.id} · rule engine · entri append-only, tidak dapat diubah`,
  }
}

// AwAuditTrailPage (S4W-16/17, US-058, desain "AW Audit Trail.dc.html").
// Dikerjakan TERAKHIR di Track S4W atas instruksi user. Ekspor CSV HANYA
// mencakup baris audit_logs (bukan Log Eksekusi Rule -- endpoint itu sudah
// punya tombol Ekspor CSV sendiri di halaman Rule Automation, S4W-11/
// IG-83), keputusan sengaja supaya tidak duplikasi jalur ekspor untuk data
// yang sama.
export default function AwAuditTrailPage() {
  const { wsId } = useParams<{ wsId: string }>()
  const workspaceId = wsId ?? ''
  const { view } = useOutletContext<WorkspaceOutletContext>()
  const isSecurityView = view === 'Akses & Keamanan'

  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('Semua')
  const [expandedId, setExpandedId] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportNotice, setExportNotice] = useState('')
  const [exportError, setExportError] = useState('')

  // days: 0 (semua, dibatasi retensi 3 tahun) -- desain TIDAK punya kontrol
  // rentang waktu sama sekali (beda dari GA Audit Trail), jadi tidak ada
  // cara bagi user memperlebar jendela kalau di sini dipatok default
  // pendek seperti GA (30 hari).
  const logs = useWorkspaceAuditLogs(workspaceId, { days: 0 })
  const executions = useWorkspaceRuleExecutions(workspaceId)

  const merged = useMemo(() => {
    const fromAudit = (logs.data ?? []).map(fromAuditEntry)
    const fromRules = (executions.data ?? []).map(fromRuleExecution)
    return [...fromAudit, ...fromRules].sort((a, b) => b.sortKey - a.sortKey)
  }, [logs.data, executions.data])

  const rows = useMemo(() => {
    let list = merged
    if (isSecurityView) list = list.filter((r) => r.type === 'ACCESS')
    if (typeFilter !== 'Semua') list = list.filter((r) => r.type === typeFilter)
    return list
  }, [merged, isSecurityView, typeFilter])

  const stats = useMemo(
    () => ({
      total: merged.length,
      changes: merged.filter((r) => r.type === 'CREATE' || r.type === 'UPDATE').length,
      access: merged.filter((r) => r.type === 'ACCESS').length,
      failedOrDeleted: merged.filter((r) => r.type === 'DELETE' || r.type === 'GAGAL').length,
    }),
    [merged],
  )

  const handleExport = async () => {
    setExporting(true)
    setExportError('')
    try {
      const blob = await exportWorkspaceAuditLogsCSV(workspaceId, {
        days: 0,
        action_type: typeFilter === 'Semua' || typeFilter === 'RULE' || typeFilter === 'GAGAL' ? undefined : typeFilter,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'audit-trail-workspace.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExportNotice('Audit trail workspace (audit_logs) diekspor ke audit-trail-workspace.csv. Log Eksekusi Rule punya ekspor CSV sendiri di halaman Rule Automation.')
    } catch {
      setExportError('Gagal mengekspor audit trail.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex flex-wrap gap-3">
        <StatCard label="ENTRI TERSIMPAN" value={String(stats.total)} note="TOTAL" />
        <StatCard label="PERUBAHAN" value={String(stats.changes)} note="CREATE & UPDATE" tone="mint" />
        <StatCard label="AKSES & EKSPOR" value={String(stats.access)} note="DIPANTAU KHUSUS" tone="amber" />
        <StatCard label="GAGAL / HAPUS" value={String(stats.failedOrDeleted)} note="PERLU DITINJAU" tone={stats.failedOrDeleted > 0 ? 'destructive' : undefined} />
      </div>

      <div className="border border-line bg-panel">
        <div className="flex flex-wrap items-center gap-2 border-b border-line-subtle px-3.5 py-2.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTypeFilter(f)}
              className={cn('border px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.06em]', typeFilter === f ? 'border-signal bg-signal/15 text-signal' : 'border-line-strong text-text-dim')}
            >
              {f.toUpperCase()}
            </button>
          ))}
          <button type="button" onClick={handleExport} disabled={exporting} className="ml-auto font-mono text-[9.5px] text-signal disabled:opacity-50">
            {exporting ? 'Mengekspor…' : '⤓ EKSPOR CSV'}
          </button>
        </div>

        {exportNotice && (
          <div className="relative border-b border-line-subtle px-3.5 py-2.5 font-mono text-[9.5px] leading-relaxed text-mint">
            ✓ {exportNotice}
            <button type="button" onClick={() => setExportNotice('')} className="absolute right-3 top-2 text-mint/60 hover:text-mint" title="Tutup">
              ✕
            </button>
          </div>
        )}
        {exportError && <div className="border-b border-line-subtle px-3.5 py-2.5 font-mono text-[9.5px] text-destructive">⚠ {exportError}</div>}

        <div>
          {(logs.isLoading || executions.isLoading) && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
          {rows.map((r) => {
            const open = expandedId === r.id
            return (
              <div
                key={r.id}
                onClick={() => setExpandedId(open ? '' : r.id)}
                className={cn('flex cursor-pointer flex-col gap-1.5 border-t border-line-subtle px-3.5 py-3', open && 'bg-raised-1')}
              >
                <div className="flex items-start gap-2.5">
                  <span className={cn('flex-shrink-0 whitespace-nowrap border px-1.5 py-0.5 font-mono text-[9px] font-semibold', TYPE_CLASS[r.type])}>{r.type}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] text-text-bone">{r.text}</div>
                    <div className="mt-1 font-mono text-[8.5px] text-text-dim">
                      {r.actor.toUpperCase()} · {r.scope} · SUMBER {r.source}
                    </div>
                  </div>
                  <span className="flex-shrink-0 whitespace-nowrap font-mono text-[9px] text-text-dim">{r.stamp}</span>
                </div>
                {open && (
                  <div className="flex flex-col gap-1.5 border border-line bg-panel p-3 font-mono text-[9px] leading-relaxed">
                    <div className="text-text-dim">
                      SEBELUM
                      <br />
                      <span className="text-text-muted">{r.before}</span>
                    </div>
                    <div className="text-text-dim">
                      SESUDAH
                      <br />
                      <span className="text-text-muted">{r.after}</span>
                    </div>
                    <div className="border-t border-line-subtle pt-2 text-text-dim">{r.forensics}</div>
                  </div>
                )}
              </div>
            )
          })}
          {!logs.isLoading && !executions.isLoading && rows.length === 0 && (
            <div className="p-8 text-center font-mono text-[10.5px] leading-relaxed text-text-dim">
              Belum ada aktivitas pada filter ini.
              <br />
              Lakukan aksi di menu lain — perubahan tercatat otomatis di sini.
            </div>
          )}
        </div>

        <div className="border-t border-line-subtle px-3.5 py-2.5 font-mono text-[9px] leading-relaxed text-text-dim">
          Entri bersifat append-only — tidak dapat diedit atau dihapus oleh peran apa pun, termasuk Platform Admin. Retensi 3 tahun. Admin
          Workspace melihat aktivitas di workspace yang dikelolanya; isi task dan komentar tidak ditampilkan, hanya metadata perubahan.
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, note, tone }: { label: string; value: string; note: string; tone?: 'mint' | 'amber' | 'destructive' }) {
  return (
    <div className="min-w-[110px] flex-1 border border-line bg-panel px-3.5 py-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">{label}</div>
      <div className={cn('mt-1 text-xl font-extrabold', tone === 'mint' && 'text-mint', tone === 'amber' && 'text-amber', tone === 'destructive' && 'text-destructive')}>{value}</div>
      <div className="mt-1 font-mono text-[8.5px] text-text-dim">{note}</div>
    </div>
  )
}
