import { useEffect, useState } from 'react'

import Grid1Pager from '@/components/shared/Grid1Pager'
import { APPROVAL_BADGE, entryErrorMessage, fmtEntryRange, fmtMinutes } from '@/features/timesheet/analytics'
import { useApproveEntry, useRejectEntry, useTimesheetEntries } from '@/features/timesheet/hooks'
import type { ApprovalFilter } from '@/features/timesheet/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10
const FILTERS: { key: ApprovalFilter; label: string }[] = [
  { key: 'pending', label: 'Menunggu' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'rejected', label: 'Ditolak' },
]

// Antrian persetujuan entri waktu manual lintas task (US-037, S8-17). Setujui
// langsung; tolak wajib catatan (kembali ke pemilik untuk diperbaiki).
export default function TimesheetApprovalView({ projectId }: { projectId: string }) {
  const [filter, setFilter] = useState<ApprovalFilter>('pending')
  const [page, setPage] = useState(1)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const entries = useTimesheetEntries(projectId, filter)
  const approve = useApproveEntry()
  const reject = useRejectEntry()

  useEffect(() => setPage(1), [filter])
  const items = entries.data?.items ?? []
  const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const onApprove = (id: string) => {
    setError('')
    approve.mutate(id, { onError: (e) => setError(entryErrorMessage(e, 'Gagal menyetujui entri waktu.')) })
  }
  const onReject = () => {
    if (!rejectingId) return
    if (!note.trim()) {
      setError('Catatan penolakan wajib diisi.')
      return
    }
    setError('')
    reject.mutate(
      { entryId: rejectingId, note: note.trim() },
      {
        onSuccess: () => {
          setRejectingId(null)
          setNote('')
        },
        onError: (e) => setError(entryErrorMessage(e, 'Gagal menolak entri waktu.')),
      },
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-line">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-bg-deep px-3.5 py-2.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn('border px-2.5 py-1 font-mono text-[9.5px] uppercase', filter === f.key ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted')}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[9px] text-text-dim">{items.length} entri manual</span>
      </div>
      {error && <p className="border-b border-line px-3.5 py-2 font-mono text-[9.5px] text-destructive">⚠ {error}</p>}
      <div className="flex-1 overflow-auto">
        {slice.map((e) => {
          const badge = APPROVAL_BADGE[e.approval_status]
          return (
            <div key={e.id} className="flex flex-col gap-1.5 border-t border-line px-3.5 py-3 first:border-t-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-[8.5px] text-text-dim">{e.task_code}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-text-bone">{e.task_title}</span>
                <span className={cn('border px-1.5 py-0.5 font-mono text-[8.5px]', badge.cls)}>{badge.label}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9.5px] text-text-muted">
                <span>{e.user.display_name || e.user.email}</span>
                <span>{fmtEntryRange(e.started_at, e.ended_at)}</span>
                <span className="text-text-body">{fmtMinutes(e.duration_minutes)}</span>
                {e.note && <span className="text-text-dim">“{e.note}”</span>}
                {e.approval_status === 'pending' && (
                  <span className="ml-auto flex gap-3">
                    <button type="button" onClick={() => onApprove(e.id)} disabled={approve.isPending} className="text-mint hover:underline disabled:opacity-40">
                      ✓ Setujui
                    </button>
                    <button type="button" onClick={() => { setRejectingId(e.id); setNote(''); setError('') }} className="text-destructive hover:underline">
                      ✕ Tolak
                    </button>
                  </span>
                )}
              </div>
              {e.approval_status === 'rejected' && e.rejection_note && <p className="font-mono text-[9px] text-destructive">Ditolak: {e.rejection_note}</p>}
              {rejectingId === e.id && (
                <div className="flex items-center gap-1.5">
                  <input
                    value={note}
                    onChange={(ev) => setNote(ev.target.value)}
                    placeholder="Alasan penolakan (wajib)..."
                    className="flex-1 border border-line-strong bg-input-bg px-2 py-1 text-[10.5px] text-text-bone outline-none focus-visible:border-signal"
                  />
                  <button type="button" onClick={onReject} disabled={reject.isPending} className="border border-destructive px-2 py-1 font-mono text-[9px] uppercase text-destructive disabled:opacity-40">
                    Kirim
                  </button>
                  <button type="button" onClick={() => setRejectingId(null)} className="border border-line-strong px-2 py-1 font-mono text-[9px] uppercase text-text-muted">
                    Batal
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {entries.isLoading && <p className="px-3.5 py-6 text-center font-mono text-[10px] text-text-dim">Memuat…</p>}
        {!entries.isLoading && items.length === 0 && (
          <p className="px-3.5 py-[30px] text-center font-mono text-[10.5px] text-text-dim">
            {filter === 'pending' ? 'Tidak ada entri yang menunggu persetujuan.' : 'Belum ada entri pada status ini.'}
          </p>
        )}
      </div>
      <Grid1Pager page={page} perPage={PAGE_SIZE} total={items.length} onPage={setPage} />
    </div>
  )
}
