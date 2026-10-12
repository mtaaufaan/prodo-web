import { useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import MyTimesheetView from '@/components/timesheet/MyTimesheetView'
import TimesheetApprovalView from '@/components/timesheet/TimesheetApprovalView'
import TimesheetMembersView from '@/components/timesheet/TimesheetMembersView'
import TimesheetSummaryView, { TimesheetStats } from '@/components/timesheet/TimesheetSummaryView'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { exportProjectTimesheetCSV } from '@/features/timesheet/api'
import { useProjectTimesheet } from '@/features/timesheet/hooks'

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

type Tab = 'Ringkasan' | 'Per-Member' | 'Persetujuan' | 'Timesheet Saya'

// Menu "Timesheet & Analitik" PM (IG-128, desain "PM Timesheet.dc.html"):
// Ringkasan + Per-Member sesuai desain; Persetujuan (US-037) dan Timesheet
// Saya (US-036) ditambahkan dari PRD. Project = project aktif switcher (URL).
export default function ProjectTimesheetPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = projectId ?? ''
  const { view } = useOutletContext<WorkspaceOutletContext>()
  const tab: Tab = view === 'Per-Member' || view === 'Persetujuan' || view === 'Timesheet Saya' ? view : 'Ringkasan'
  const sheet = useProjectTimesheet(pid)
  const [notice, setNotice] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 15000)
    return () => clearTimeout(t)
  }, [notice])

  const onExport = async () => {
    setExporting(true)
    setNotice('')
    try {
      const blob = await exportProjectTimesheetCSV(pid)
      const slug = (sheet.data?.project_name ?? 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project'
      triggerDownload(blob, `timesheet-${slug}.csv`)
      setNotice(`${sheet.data?.tasks.length ?? 0} task diekspor ke timesheet-${slug}.csv — kolom: kode task, judul, status, PIC aktif, estimasi, jam tercatat, selisih. Tercatat di Audit Trail.`)
    } catch {
      setNotice('!Gagal mengekspor timesheet. Coba lagi.')
    } finally {
      setExporting(false)
    }
  }

  if (sheet.isError) {
    const code = (sheet.error as { code?: string } | null)?.code
    return (
      <div className="border border-line p-6 font-mono text-[11px] text-text-dim">
        {code === 'FORBIDDEN' ? 'Timesheet & Analitik hanya untuk Project Manager project ini, Admin Workspace, atau Group Admin.' : 'Gagal memuat timesheet project.'}
      </div>
    )
  }

  const showAnalytics = tab === 'Ringkasan' || tab === 'Per-Member'
  const failed = notice.startsWith('!')
  return (
    <ErrorBoundary>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-2.5 pb-3">
          <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-text-dim">Project</span>
          <span className="border border-signal bg-signal px-2.5 py-1.5 font-mono text-[9.5px] text-bg-deep">{sheet.data?.project_name ?? '—'}</span>
          {sheet.data && sheet.data.pending_count > 0 && (
            <span className="border border-amber px-2.5 py-1.5 font-mono text-[9px] text-amber">{sheet.data.pending_count} ENTRI MENUNGGU PERSETUJUAN</span>
          )}
          {showAnalytics && (
            <button type="button" onClick={onExport} disabled={exporting || !sheet.data} className="ml-auto whitespace-nowrap font-mono text-[9.5px] text-signal hover:underline disabled:opacity-40">
              ⤓ EKSPOR CSV
            </button>
          )}
        </div>

        {notice && (
          <div className={`relative mb-3 border px-[13px] py-[11px] pr-[34px] font-mono text-[10px] leading-[1.7] ${failed ? 'border-destructive text-destructive' : 'border-mint text-mint'}`}>
            {failed ? `⚠ ${notice.slice(1)}` : `✓ ${notice}`}
            <button type="button" onClick={() => setNotice('')} title="Tutup" className="absolute right-[7px] top-[5px] px-[5px] py-[3px] text-[11px] leading-none opacity-60">
              ✕
            </button>
          </div>
        )}

        {showAnalytics && sheet.data && <TimesheetStats data={sheet.data} />}
        {showAnalytics && sheet.isLoading && <p className="font-mono text-[10px] text-text-dim">Memuat timesheet…</p>}
        {tab === 'Ringkasan' && sheet.data && <TimesheetSummaryView data={sheet.data} />}
        {tab === 'Per-Member' && sheet.data && <TimesheetMembersView members={sheet.data.members} />}
        {tab === 'Persetujuan' && <TimesheetApprovalView projectId={pid} />}
        {tab === 'Timesheet Saya' && <MyTimesheetView projectId={pid} />}
      </div>
    </ErrorBoundary>
  )
}
