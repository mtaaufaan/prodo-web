import { useMemo, useState } from 'react'

import { dueBucket, isOwnTask, todayISO, type BoardMode } from '@/components/tasks/boardMode'
import Grid1Pager from '@/components/shared/Grid1Pager'
import { statusColorClasses, type CustomStatus, type Task, type TaskPriority } from '@/features/tasks/types'
import { formatDateDMY } from '@/lib/date'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

const PRIORITY_TEXT: Record<TaskPriority, string> = {
  low: 'text-text-muted',
  medium: 'text-blue',
  high: 'text-amber',
  critical: 'text-red',
}

const ALL = 'Semua'
const NO_ASSIGNEE = 'Belum ada'
const DUE_OPTIONS = [ALL, 'Terlambat', '7 hari', '> 7 hari']
const PER_PAGE_OPTIONS = [10, 20, 50]

interface TaskListViewProps {
  tasks: Task[]
  statuses: CustomStatus[]
  mode: BoardMode
  onOpenTask: (taskId: string) => void
}

// TaskListView -- tab "Daftar" Board ("PM Board.dc.html" isList, S6E-05): filter Status/Assignee/Due,
// BARIS/HAL, tabel TASK/STATUS/PRIO/ASSIGNEE/DUE. Dipakai semua role; mode Editor menandai MILIK SAYA
// dan meredupkan task orang lain (hanya dapat dibaca). Aksi ubah (geser/pindah/lengkap) ada di Kanban
// dan Task Detail, bukan di tabel ini.
export default function TaskListView({ tasks, statuses, mode, onOpenTask }: TaskListViewProps) {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [fStatus, setFStatus] = useState(ALL)
  const [fAssignee, setFAssignee] = useState(ALL)
  const [fDue, setFDue] = useState(ALL)
  const [perPage, setPerPage] = useState(PER_PAGE_OPTIONS[0])
  const [page, setPage] = useState(1)

  const today = todayISO()
  const assigneeNames = useMemo(() => {
    const names = new Set<string>()
    tasks.forEach((t) => t.assignees.forEach((a) => names.add(a.display_name || a.email)))
    return [...names]
  }, [tasks])

  const filtered = useMemo(
    () =>
      tasks
        .filter((t) => fStatus === ALL || t.status_name === fStatus)
        .filter((t) =>
          fAssignee === ALL
            ? true
            : fAssignee === NO_ASSIGNEE
              ? t.assignees.length === 0
              : t.assignees.some((a) => (a.display_name || a.email) === fAssignee),
        )
        .filter((t) => fDue === ALL || dueBucket(t, today) === fDue),
    [tasks, fStatus, fAssignee, fDue, today],
  )

  const filterActive = fStatus !== ALL || fAssignee !== ALL || fDue !== ALL
  const visible = filtered.slice((page - 1) * perPage, page * perPage)
  const statusColor = (t: Task) => statusColorClasses(statuses.find((s) => s.id === t.status_id)?.color_token ?? t.status_color)
  const reset = () => {
    setFStatus(ALL)
    setFAssignee(ALL)
    setFDue(ALL)
    setPage(1)
  }

  const filterGroups = [
    { label: 'STATUS', value: fStatus, options: [ALL, ...statuses.map((s) => s.name)], onChange: (v: string) => setFStatus(v) },
    { label: 'ASSIGNEE', value: fAssignee, options: [ALL, ...assigneeNames, NO_ASSIGNEE], onChange: (v: string) => setFAssignee(v) },
    { label: 'DUE DATE', value: fDue, options: DUE_OPTIONS, onChange: (v: string) => setFDue(v) },
  ]
  const selectCls = 'border border-line bg-input-bg px-2 py-1.5 font-mono text-[10px] text-text-body outline-none'

  return (
    <div className="flex min-h-0 flex-1 flex-col border border-line">
      <div className="flex-shrink-0 border-b border-line">
        <div className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="border border-line-strong px-2.5 py-1 font-mono text-[9px] tracking-[0.12em] text-text-muted hover:text-text-bone"
          >
            FILTER {filtersOpen ? '▴' : '▾'}
          </button>
          {filterActive && <span className="border border-signal px-1.5 py-0.5 font-mono text-[8.5px] text-signal">AKTIF</span>}
          <span className="font-mono text-[9px] text-text-dim">
            {filtered.length} TASK DITAMPILKAN DARI {tasks.length}
          </span>
        </div>
        {filtersOpen && (
          <div className="flex flex-wrap items-end gap-4 border-t border-line bg-raised px-3.5 py-3">
            {filterGroups.map((g) => (
              <label key={g.label} className="flex flex-col gap-1">
                <span className="font-mono text-[8.5px] tracking-[0.12em] text-text-dim">{g.label}</span>
                <select
                  aria-label={g.label}
                  value={g.value}
                  onChange={(e) => {
                    g.onChange(e.target.value)
                    setPage(1)
                  }}
                  className={selectCls}
                >
                  {g.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[8.5px] tracking-[0.12em] text-text-dim">BARIS / HAL</span>
              <select
                aria-label="BARIS / HAL"
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
                className={selectCls}
              >
                {PER_PAGE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={reset} className="border border-line-strong px-3 py-1.5 font-mono text-[9.5px] text-text-muted hover:border-signal hover:text-signal">
              RESET
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid grid-cols-[18px_minmax(0,1fr)_110px_70px_110px_90px] gap-3 border-b border-line px-3.5 py-2 font-mono text-[8.5px] tracking-[0.12em] text-text-dim">
          <span>■</span>
          <span>TASK</span>
          <span>STATUS</span>
          <span>PRIO</span>
          <span>ASSIGNEE</span>
          <span>DUE</span>
        </div>
        {visible.map((t) => {
          const own = mode.limitToMine && isOwnTask(t, currentUserId)
          const dim = mode.limitToMine && !own
          const first = (t.assignees[0]?.display_name || t.assignees[0]?.email || '').split(' ')[0]
          const color = statusColor(t)
          return (
            <div
              key={t.id}
              title={dim ? 'Hanya dapat dibaca — task ini bukan milik Anda' : undefined}
              className={cn('grid grid-cols-[18px_minmax(0,1fr)_110px_70px_110px_90px] items-center gap-3 border-b border-line-subtle px-3.5 py-2.5', dim && 'opacity-60')}
            >
              <span className={cn('h-2 w-2', color.dot)} />
              <button type="button" onClick={() => onOpenTask(t.id)} className="min-w-0 text-left">
                <div className="truncate text-[13px] text-text-bone hover:text-signal">{t.title}</div>
                <div className="mt-0.5 font-mono text-[9px] text-text-dim">
                  {t.task_code} · {t.sprint_name ?? 'Backlog'}
                  {own && (
                    <>
                      {' · '}
                      <span className="text-mint">MILIK SAYA</span>
                    </>
                  )}
                  {dim && ' · 🔒'}
                  {t.completeness === 'incomplete' && t.status_name === 'BACKLOG' && (
                    <>
                      {' · '}
                      <span className="text-amber">BELUM LENGKAP</span>
                    </>
                  )}
                </div>
              </button>
              <span className={cn('font-mono text-[9.5px] font-semibold', color.text)}>{t.status_name}</span>
              <span className={cn('font-mono text-[9.5px] font-semibold uppercase', PRIORITY_TEXT[t.priority])}>{t.priority}</span>
              <span className="truncate font-mono text-[10px] text-text-muted">{t.assignees.length ? `${first}${t.assignees.length > 1 ? ` +${t.assignees.length - 1}` : ''}` : '—'}</span>
              <span className={cn('font-mono text-[10px]', dueBucket(t, today) === 'Terlambat' ? 'text-red' : 'text-text-muted')}>{formatDateDMY(t.due_date)}</span>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="p-[30px_14px] text-center font-mono text-[10.5px] leading-[1.8] text-text-dim">
            {tasks.length === 0 ? (
              <>
                Tidak ada task pada project ini.
                <br />
                Gunakan + TASK untuk menambahkan.
              </>
            ) : (
              'Tidak ada task yang cocok dengan filter.'
            )}
          </div>
        )}
      </div>
      <Grid1Pager page={page} perPage={perPage} total={filtered.length} onPage={setPage} />
    </div>
  )
}
