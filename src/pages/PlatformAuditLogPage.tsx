import { useMemo, useState } from 'react'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { exportAuditLogsCSV } from '@/features/platform-admin/api'
import { useAuditLogs } from '@/features/platform-admin/hooks'
import type { PlatformAuditLogEntry } from '@/features/platform-admin/types'

const paFieldFont = 'font-mono text-[12.5px]'
const selectClassName =
  `flex h-9 w-full rounded-none border border-line bg-input-bg px-2.5 py-2 ${paFieldFont} text-text-body focus-visible:outline-none focus-visible:border-signal`

// ACTION_OPTIONS -- kode aksi nyata yang sudah dicatat account_repository.go
// (S4P-20/21). Desain "PA Audit Trail" menampilkan kalimat siap-baca per
// baris (mis. "Mengubah batas kuota global tier BUSINESS..."), TAPI itu
// butuh formatting khusus per jenis aksi dari metadata JSON -- di luar
// scope 4 task S4P-20..23. Di sini kode aksi terstruktur (mis.
// "tier.updated") ditampilkan apa adanya -- konsisten dengan seluruh
// audit_logs yang sudah ada dan cocok untuk filter/export CSV.
const ACTION_OPTIONS = [
  { value: '', label: 'SEMUA AKSI' },
  { value: 'user.invited', label: 'GA Diundang' },
  { value: 'user.updated', label: 'GA Diperbarui' },
  { value: 'user.suspended', label: 'GA Disuspend' },
  { value: 'user.reactivated', label: 'GA Diaktifkan Kembali' },
  { value: 'user.deleted', label: 'GA Dihapus' },
  { value: 'user.activation_resent', label: 'Invitation Dikirim Ulang' },
  { value: 'group.transferred', label: 'Grup Ditransfer' },
  { value: 'tier.created', label: 'Tier Ditambahkan' },
  { value: 'tier.updated', label: 'Tier Diperbarui' },
  { value: 'tier.deactivated', label: 'Tier Dinonaktifkan' },
  { value: 'tier.reactivated', label: 'Tier Diaktifkan Kembali' },
  { value: 'tier.archived', label: 'Tier Di-archive' },
  { value: 'tier.unarchived', label: 'Tier Dipulihkan' },
  { value: 'tier.deleted', label: 'Tier Dihapus' },
  { value: 'platform_settings.session_timeout_changed', label: 'Session Timeout Diubah' },
  { value: 'ip_allowlist.added', label: 'IP Allowlist Ditambahkan' },
  { value: 'ip_allowlist.removed', label: 'IP Allowlist Dihapus' },
  { value: 'user.login', label: 'Login Platform Admin' },
]

function PlatformAuditLogPageContent() {
  const [actionType, setActionType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [actorQuery, setActorQuery] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const filter = {
    action_type: actionType || undefined,
    from: from || undefined,
    to: to || undefined,
  }
  const logs = useAuditLogs(filter)

  // Filter pelaku dilakukan di klien (cocokkan email/nama) -- belum ada
  // endpoint "daftar Platform Admin" untuk dijadikan dropdown/picker
  // (fitur itu dijadwalkan S4P-37+, US-084), jadi belum bisa difilter di
  // server lewat actor_id. Cukup untuk jumlah PA yang masih sedikit.
  const filteredEntries = useMemo(() => {
    if (!logs.data) return []
    const q = actorQuery.trim().toLowerCase()
    if (!q) return logs.data
    return logs.data.filter((e) => e.actor_email?.toLowerCase().includes(q) || e.actor_display_name?.toLowerCase().includes(q))
  }, [logs.data, actorQuery])

  const handleExport = async () => {
    setExporting(true)
    setExportError('')
    try {
      const blob = await exportAuditLogsCSV(filter)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'platform-audit-logs.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setExportError('Gagal mengekspor CSV. Coba lagi.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
            Jejak Audit Level Platform · Append-Only
          </div>
          <div className="mt-1.5 text-base font-bold">{filteredEntries.length} kejadian ditampilkan</div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 border border-pa-accent px-3.5 py-2 font-mono text-[11px] tracking-[0.06em] text-pa-accent disabled:opacity-50"
        >
          {exporting ? 'Mengekspor...' : '⬇ Export CSV'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Jenis Aksi</label>
          <select className={selectClassName} value={actionType} onChange={(e) => setActionType(e.target.value)}>
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Pelaku</label>
          <input
            type="text"
            placeholder="email atau nama"
            className={selectClassName}
            value={actorQuery}
            onChange={(e) => setActorQuery(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Dari Tanggal</label>
          <input type="date" className={selectClassName} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Sampai Tanggal</label>
          <input type="date" className={selectClassName} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {exportError && <p className="font-mono text-[11px] text-destructive">{exportError}</p>}
      {logs.isLoading && <p className="font-mono text-sm text-text-muted">Memuat...</p>}
      {logs.isError && <p className="font-mono text-sm text-destructive">Gagal memuat jejak audit.</p>}

      {logs.data && (
        <div className="overflow-x-auto border border-pa-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-pa-header text-left">
                {['Waktu', 'Aksi', 'Entitas', 'Pelaku'].map((h) => (
                  <th key={h} className="py-2.5 pl-3.5 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((e) => (
                <AuditLogRow key={e.id} entry={e} />
              ))}
            </tbody>
          </table>
          {filteredEntries.length === 0 && (
            <p className="p-4 font-mono text-[11px] text-text-muted">Tidak ada kejadian yang cocok dengan filter.</p>
          )}
        </div>
      )}

      <p className="font-mono text-[9.5px] leading-relaxed text-text-dim">
        Jejak audit level platform bersifat append-only: perubahan tier, registrasi dan suspend Group Admin, transfer
        grup, pengaturan keamanan, dan login Platform Admin. Record tidak dapat diubah atau dihapus.
      </p>
    </div>
  )
}

function AuditLogRow({ entry }: { entry: PlatformAuditLogEntry }) {
  const time = new Date(entry.logged_at).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <tr className="border-b border-line last:border-0">
      <td className="whitespace-nowrap py-2.5 pl-3.5 pr-4 font-mono text-[10.5px] text-text-dim">{time}</td>
      <td className="py-2.5 pr-4 font-mono text-[11px] text-text-body">{entry.action}</td>
      <td className="py-2.5 pr-4 font-mono text-[10.5px] text-text-muted">
        {entry.entity_type}
        {entry.entity_id && <span className="text-text-dim"> · {entry.entity_id.slice(0, 8)}</span>}
      </td>
      <td className="py-2.5 pr-4 font-mono text-[10.5px] text-text-muted">
        {entry.actor_display_name ?? entry.actor_email ?? '—'}
      </td>
    </tr>
  )
}

export default function PlatformAuditLogPage() {
  return (
    <ErrorBoundary>
      <PlatformAuditLogPageContent />
    </ErrorBoundary>
  )
}
