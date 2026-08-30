import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { formatAuditNarrative } from '@/features/platform-admin/auditNarrative'
import { exportAuditLogsCSV } from '@/features/platform-admin/api'
import { useAuditLogs } from '@/features/platform-admin/hooks'
import type { PlatformAuditLogEntry } from '@/features/platform-admin/types'
import { localeForLanguage } from '@/lib/utils'

const paFieldFont = 'font-mono text-[12.5px]'
const selectClassName = `flex h-9 w-full rounded-none border border-line bg-input-bg px-2.5 py-2 ${paFieldFont} text-text-body focus-visible:outline-none focus-visible:border-signal`

// ACTION_OPTIONS -- kode aksi nyata yang sudah dicatat account_repository.go
// (S4P-20/21). Desain "PA Audit Trail" menampilkan kalimat siap-baca per
// baris (mis. "Mengubah batas kuota global tier BUSINESS..."), TAPI itu
// butuh formatting khusus per jenis aksi dari metadata JSON -- di luar
// scope 4 task S4P-20..23. Di sini kode aksi terstruktur (mis.
// "tier.updated") ditampilkan apa adanya -- konsisten dengan seluruh
// audit_logs yang sudah ada dan cocok untuk filter/export CSV.
function getActionOptions(t: (key: string) => string) {
  return [
    { value: '', label: t('platformAuditLogPage.actionOptions.all') },
    { value: 'user.invited', label: t('platformAuditLogPage.actionOptions.userInvited') },
    { value: 'user.updated', label: t('platformAuditLogPage.actionOptions.userUpdated') },
    { value: 'user.suspended', label: t('platformAuditLogPage.actionOptions.userSuspended') },
    { value: 'user.reactivated', label: t('platformAuditLogPage.actionOptions.userReactivated') },
    { value: 'user.deleted', label: t('platformAuditLogPage.actionOptions.userDeleted') },
    { value: 'user.activation_resent', label: t('platformAuditLogPage.actionOptions.userActivationResent') },
    { value: 'group.transferred', label: t('platformAuditLogPage.actionOptions.groupTransferred') },
    { value: 'group.contract_created', label: t('platformAuditLogPage.actionOptions.groupContractCreated') },
    { value: 'group.contract_renewed', label: t('platformAuditLogPage.actionOptions.groupContractRenewed') },
    { value: 'tier.created', label: t('platformAuditLogPage.actionOptions.tierCreated') },
    { value: 'tier.updated', label: t('platformAuditLogPage.actionOptions.tierUpdated') },
    { value: 'tier.deactivated', label: t('platformAuditLogPage.actionOptions.tierDeactivated') },
    { value: 'tier.reactivated', label: t('platformAuditLogPage.actionOptions.tierReactivated') },
    { value: 'tier.archived', label: t('platformAuditLogPage.actionOptions.tierArchived') },
    { value: 'tier.unarchived', label: t('platformAuditLogPage.actionOptions.tierUnarchived') },
    { value: 'tier.deleted', label: t('platformAuditLogPage.actionOptions.tierDeleted') },
    {
      value: 'platform_settings.session_timeout_changed',
      label: t('platformAuditLogPage.actionOptions.sessionTimeoutChanged'),
    },
    { value: 'ip_allowlist.added', label: t('platformAuditLogPage.actionOptions.ipAllowlistAdded') },
    { value: 'ip_allowlist.removed', label: t('platformAuditLogPage.actionOptions.ipAllowlistRemoved') },
    {
      value: 'platform_settings.ip_allowlist_enabled_changed',
      label: t('platformAuditLogPage.actionOptions.ipAllowlistEnabledChanged'),
    },
    { value: 'user.login', label: t('platformAuditLogPage.actionOptions.userLogin') },
    { value: 'user.backup_code_used', label: t('platformAuditLogPage.actionOptions.userBackupCodeUsed') },
    { value: 'erasure.executed', label: t('platformAuditLogPage.actionOptions.erasureExecuted') },
    { value: 'erasure.rejected', label: t('platformAuditLogPage.actionOptions.erasureRejected') },
    { value: 'user.mfa_reset', label: t('platformAuditLogPage.actionOptions.userMfaReset') },
  ]
}

const AUDIT_LOG_PAGE_SIZE = 10

function PlatformAuditLogPageContent() {
  const { t } = useTranslation()
  const actionOptions = useMemo(() => getActionOptions(t), [t])
  const [actionType, setActionType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [actorQuery, setActorQuery] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [page, setPage] = useState(1)

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

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / AUDIT_LOG_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedEntries = filteredEntries.slice(
    (currentPage - 1) * AUDIT_LOG_PAGE_SIZE,
    currentPage * AUDIT_LOG_PAGE_SIZE,
  )

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
      setExportError(t('platformAuditLogPage.exportError'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
            {t('platformAuditLogPage.subtitle')}
          </div>
          <div className="mt-1.5 text-base font-bold">
            {t('platformAuditLogPage.eventsShown', { count: filteredEntries.length })}
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 border border-pa-accent px-3.5 py-2 font-mono text-[11px] tracking-[0.06em] text-pa-accent disabled:opacity-50"
        >
          {exporting ? t('platformAuditLogPage.exporting') : t('platformAuditLogPage.exportCsv')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
            {t('platformAuditLogPage.filters.actionType')}
          </label>
          <select
            className={selectClassName}
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value)
              setPage(1)
            }}
          >
            {actionOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
            {t('platformAuditLogPage.filters.actor')}
          </label>
          <input
            type="text"
            placeholder={t('platformAuditLogPage.filters.actorPlaceholder')}
            className={selectClassName}
            value={actorQuery}
            onChange={(e) => {
              setActorQuery(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
            {t('platformAuditLogPage.filters.fromDate')}
          </label>
          <input
            type="date"
            className={selectClassName}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
            {t('platformAuditLogPage.filters.toDate')}
          </label>
          <input
            type="date"
            className={selectClassName}
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {exportError && <p className="font-mono text-[11px] text-destructive">{exportError}</p>}
      {logs.isLoading && <p className="font-mono text-sm text-text-muted">{t('platformAuditLogPage.loading')}</p>}
      {logs.isError && <p className="font-mono text-sm text-destructive">{t('platformAuditLogPage.loadError')}</p>}

      {logs.data && (
        <div className="overflow-x-auto border border-pa-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-pa-header text-left">
                {[
                  t('platformAuditLogPage.table.headers.time'),
                  t('platformAuditLogPage.table.headers.action'),
                  t('platformAuditLogPage.table.headers.entity'),
                  t('platformAuditLogPage.table.headers.actor'),
                  t('platformAuditLogPage.table.headers.origin'),
                ].map((h) => (
                  <th key={h} className="py-2.5 pl-3.5 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedEntries.map((e) => (
                <AuditLogRow key={e.id} entry={e} />
              ))}
            </tbody>
          </table>
          {filteredEntries.length === 0 && (
            <p className="p-4 font-mono text-[11px] text-text-muted">{t('platformAuditLogPage.emptyState')}</p>
          )}
          {filteredEntries.length > AUDIT_LOG_PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-pa-border px-4 py-2.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted disabled:opacity-40"
              >
                ← {t('platformAuditLogPage.pagination.previous')}
              </button>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-dim">
                {t('platformAuditLogPage.pagination.page')}
                <input
                  key={currentPage}
                  ref={pageInputRef}
                  type="number"
                  min={1}
                  max={totalPages}
                  defaultValue={currentPage}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') goToPage(e.currentTarget.value)
                  }}
                  className="w-11 border border-line-strong bg-input-bg px-1 py-0.5 text-center font-mono text-[10px] text-text-body focus-visible:border-signal focus-visible:outline-none"
                  aria-label={t('platformAuditLogPage.pagination.pageNumberAriaLabel')}
                />
                / {totalPages} · {t('platformAuditLogPage.pagination.dataCount', { count: filteredEntries.length })}
                <button
                  type="button"
                  onClick={() => goToPage(pageInputRef.current?.value ?? '')}
                  className="border border-line-strong px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.04em] text-text-muted"
                >
                  {t('platformAuditLogPage.pagination.go')}
                </button>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted disabled:opacity-40"
              >
                {t('platformAuditLogPage.pagination.next')} →
              </button>
            </div>
          )}
        </div>
      )}

      <p className="font-mono text-[9.5px] leading-relaxed text-text-dim">{t('platformAuditLogPage.footer')}</p>
    </div>
  )
}

function AuditLogRow({ entry }: { entry: PlatformAuditLogEntry }) {
  const { t, i18n } = useTranslation()
  const time = new Date(entry.logged_at).toLocaleString(localeForLanguage(i18n.language), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <tr className="border-b border-line last:border-0">
      <td className="whitespace-nowrap py-2.5 pl-3.5 pr-4 font-mono text-[10.5px] text-text-dim">{time}</td>
      <td className="py-2.5 pr-4 text-[12.5px] text-text-body">
        {formatAuditNarrative(entry, t)}
        <div className="mt-0.5 font-mono text-[9px] text-text-dim">{entry.action}</div>
      </td>
      <td className="py-2.5 pr-4 font-mono text-[10.5px] text-text-muted">
        {entry.entity_type}
        {entry.entity_id && <span className="text-text-dim"> · {entry.entity_id.slice(0, 8)}</span>}
      </td>
      <td className="py-2.5 pr-4 font-mono text-[10.5px] text-text-muted">
        {entry.actor_display_name ?? entry.actor_email ?? '—'}
      </td>
      <td className="py-2.5 pr-4 font-mono text-[10.5px] text-text-muted">
        {entry.actor_ip ?? '—'}
        {typeof entry.metadata?.request_path === 'string' && (
          <div className="mt-0.5 text-[9px] text-text-dim">{entry.metadata.request_path}</div>
        )}
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
