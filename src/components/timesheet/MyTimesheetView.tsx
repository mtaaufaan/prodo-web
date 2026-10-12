import { useEffect, useState } from 'react'

import EntryForm, { type EntryFormValues } from '@/components/timesheet/EntryForm'
import Grid1Pager from '@/components/shared/Grid1Pager'
import { useProjectTasks } from '@/features/tasks/hooks'
import { APPROVAL_BADGE, entryErrorMessage, fmtEntryRange, fmtMinutes, toLocalInput } from '@/features/timesheet/analytics'
import { useCreateEntry, useMyTimesheet, useUpdateEntry } from '@/features/timesheet/hooks'
import type { MyTimesheetEntry } from '@/features/timesheet/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10
const DATE_FIELD = 'border border-line-strong bg-input-bg px-2 py-1 font-mono text-[10px] text-text-bone outline-none focus-visible:border-signal'

// Timesheet pribadi (US-036 AC, S8-10): seluruh entri milik sendiri lintas
// project + filter tanggal + tambah entri manual (task project aktif) +
// perbaiki entri yang menunggu/ditolak.
export default function MyTimesheetView({ projectId }: { projectId: string }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [serverError, setServerError] = useState('')
  const rangeInvalid = from !== '' && to !== '' && to < from
  const mine = useMyTimesheet(from, to, !rangeInvalid)
  const tasks = useProjectTasks(projectId)
  const create = useCreateEntry()
  const update = useUpdateEntry()

  useEffect(() => setPage(1), [from, to])
  const items = mine.data?.items ?? []
  const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const onCreate = (v: EntryFormValues) => {
    setServerError('')
    create.mutate(
      { taskId: v.taskId, values: { started_at: v.started_at, ended_at: v.ended_at, note: v.note } },
      { onSuccess: () => setAdding(false), onError: (e) => setServerError(entryErrorMessage(e, 'Gagal menambah entri waktu.')) },
    )
  }
  const onUpdate = (entryId: string, v: EntryFormValues) => {
    setServerError('')
    update.mutate(
      { entryId, values: { started_at: v.started_at, ended_at: v.ended_at, note: v.note } },
      { onSuccess: () => setEditingId(null), onError: (e) => setServerError(entryErrorMessage(e, 'Gagal mengubah entri waktu.')) },
    )
  }
  const canEdit = (e: MyTimesheetEntry) => e.entry_type === 'manual' && e.approval_status !== 'approved'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <div className="flex flex-wrap items-end gap-3 border border-line bg-panel px-3.5 py-3">
        <label className="flex flex-col gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-dim">
          Dari
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={DATE_FIELD} />
        </label>
        <label className="flex flex-col gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-dim">
          Sampai
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={DATE_FIELD} />
        </label>
        {(from || to) && (
          <button type="button" onClick={() => { setFrom(''); setTo('') }} className="font-mono text-[9.5px] uppercase text-text-muted hover:text-text-bone">
            Reset
          </button>
        )}
        <div className="ml-auto flex items-center gap-4 font-mono text-[9.5px]">
          <span className="text-text-dim">
            DISETUJUI <b className="text-mint">{fmtMinutes(mine.data?.approved_minutes ?? 0)}</b>
          </span>
          <span className="text-text-dim">
            MENUNGGU <b className="text-amber">{fmtMinutes(mine.data?.pending_minutes ?? 0)}</b>
          </span>
          <button type="button" onClick={() => { setAdding(true); setServerError('') }} className="border border-signal px-3 py-1.5 font-bold uppercase text-signal">
            + Entri Manual
          </button>
        </div>
      </div>
      {rangeInvalid && <p className="font-mono text-[9.5px] text-destructive">⚠ Tanggal &quot;Sampai&quot; harus sama dengan atau setelah &quot;Dari&quot;.</p>}

      {adding && (
        <EntryForm
          tasks={(tasks.data ?? []).map((t) => ({ id: t.id, task_code: t.task_code, title: t.title }))}
          submitLabel="Kirim untuk Persetujuan"
          busy={create.isPending}
          serverError={serverError}
          onSubmit={onCreate}
          onCancel={() => setAdding(false)}
        />
      )}

      <div className="border border-line">
        {slice.map((e) => {
          const badge = APPROVAL_BADGE[e.approval_status]
          return (
            <div key={e.id} className="flex flex-col gap-1.5 border-t border-line px-3.5 py-3 first:border-t-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-[8.5px] text-text-dim">{e.task_code}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-text-bone">{e.task_title}</span>
                <span className="border border-line-strong px-1.5 py-0.5 font-mono text-[8.5px] uppercase text-text-muted">{e.entry_type === 'timer' ? 'Timer' : 'Manual'}</span>
                <span className={cn('border px-1.5 py-0.5 font-mono text-[8.5px]', badge.cls)}>{badge.label}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9.5px] text-text-muted">
                <span>{e.project.name}</span>
                <span>{fmtEntryRange(e.started_at, e.ended_at)}</span>
                <span className="text-text-body">{fmtMinutes(e.duration_minutes)}</span>
                {e.note && <span className="text-text-dim">“{e.note}”</span>}
                {canEdit(e) && (
                  <button type="button" onClick={() => { setEditingId(e.id); setServerError('') }} className="ml-auto text-signal hover:underline">
                    ✎ {e.approval_status === 'rejected' ? 'Perbaiki' : 'Ubah'}
                  </button>
                )}
              </div>
              {e.approval_status === 'rejected' && e.rejection_note && <p className="font-mono text-[9px] text-destructive">Ditolak: {e.rejection_note}</p>}
              {editingId === e.id && (
                <EntryForm
                  tasks={null}
                  initial={{ startLocal: toLocalInput(e.started_at), endLocal: e.ended_at ? toLocalInput(e.ended_at) : '', note: e.note ?? '' }}
                  submitLabel={e.approval_status === 'rejected' ? 'Kirim Ulang' : 'Simpan'}
                  busy={update.isPending}
                  serverError={serverError}
                  onSubmit={(v) => onUpdate(e.id, v)}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </div>
          )
        })}
        {mine.isLoading && <p className="px-3.5 py-6 text-center font-mono text-[10px] text-text-dim">Memuat…</p>}
        {!mine.isLoading && items.length === 0 && <p className="px-3.5 py-[30px] text-center font-mono text-[10.5px] text-text-dim">Belum ada entri waktu pada rentang ini.</p>}
        <Grid1Pager page={page} perPage={PAGE_SIZE} total={items.length} onPage={setPage} />
      </div>
    </div>
  )
}
