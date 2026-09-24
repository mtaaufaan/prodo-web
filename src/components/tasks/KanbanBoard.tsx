import { useMemo, useRef, useState } from 'react'

import PicPickerModal from '@/components/tasks/PicPickerModal'
import { useProjectMembers } from '@/features/project-members/hooks'
import { useBulkSetTaskStatus, useReorderTask, useSetTaskStatus } from '@/features/tasks/hooks'
import type { CustomStatus, Task, TaskPriority } from '@/features/tasks/types'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

const PRIORITY_TONE: Record<TaskPriority, string> = {
  low: 'border-text-muted text-text-muted',
  medium: 'border-blue text-blue',
  high: 'border-amber text-amber',
  critical: 'border-destructive text-destructive',
}

type PendingMove = { kind: 'single'; taskId: string; statusId: string; statusName: string } | { kind: 'bulk'; statusId: string; statusName: string }

// KanbanBoard (Track S5, menu Board, desain "PM Board.dc.html") --
// drag-drop lintas kolom (gerbang PIC reuse TaskService.SetStatus apa
// adanya via PicPickerModal), drag-geser dalam kolom (reorder, TIDAK
// butuh PIC), bulk select + bulk pindah status, filter "Punya Saya", chip
// lompat-kolom, tombol quick-move (status tetangga) per kartu. Animasi
// CSS keyframes desain asli (cardDown/cardUp/cardIn) SENGAJA disederhanakan
// jadi transition polos -- fungsional/informasi sama persis, cuma micro-
// animation yang dilewatkan.
interface KanbanBoardProps {
  projectId: string
  statuses: CustomStatus[]
  tasks: Task[]
  onOpenTask: (taskId: string) => void
}

export default function KanbanBoard({ projectId, statuses, tasks, onOpenTask }: KanbanBoardProps) {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const members = useProjectMembers(projectId, true)
  const setStatus = useSetTaskStatus(projectId)
  const reorder = useReorderTask(projectId)
  const bulkSetStatus = useBulkSetTaskStatus(projectId)

  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)
  const [overCardId, setOverCardId] = useState<string | null>(null)
  const [overSide, setOverSide] = useState<'before' | 'after'>('before')
  const [selected, setSelected] = useState<string[]>([])
  const [mineOnly, setMineOnly] = useState(false)
  const [pending, setPending] = useState<PendingMove | null>(null)
  const [pendingError, setPendingError] = useState('')
  const trackRef = useRef<HTMLDivElement>(null)

  const sortedStatuses = useMemo(() => [...statuses].sort((a, b) => a.position - b.position), [statuses])

  const columns = useMemo(
    () =>
      sortedStatuses.map((s) => ({
        status: s,
        cards: tasks.filter((t) => t.status_id === s.id).sort((a, b) => a.position - b.position),
      })),
    [sortedStatuses, tasks],
  )

  const isMine = (t: Task) => t.assignees.some((a) => a.user_id === currentUserId)

  const toggleSelect = (taskId: string) => {
    setSelected((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]))
  }

  const jumpToColumn = (statusId: string) => {
    const el = document.getElementById(`kanban-col-${statusId}`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }

  const onCardDrop = (target: Task) => (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const srcId = dragTaskId
    setDragTaskId(null)
    setOverColumnId(null)
    setOverCardId(null)
    if (!srcId || srcId === target.id) return
    const src = tasks.find((t) => t.id === srcId)
    if (!src) return
    if (src.status_id !== target.status_id) {
      const targetStatus = sortedStatuses.find((s) => s.id === target.status_id)
      if (!targetStatus) return
      setPending({ kind: 'single', taskId: src.id, statusId: targetStatus.id, statusName: targetStatus.name })
      setPendingError('')
      return
    }
    reorder.mutate({ taskId: src.id, targetTaskId: target.id, placeBefore: overSide === 'before' })
  }

  const onColumnDrop = (status: CustomStatus) => (e: React.DragEvent) => {
    e.preventDefault()
    const srcId = dragTaskId
    setDragTaskId(null)
    setOverColumnId(null)
    if (!srcId) return
    const src = tasks.find((t) => t.id === srcId)
    if (!src || src.status_id === status.id) return
    setPending({ kind: 'single', taskId: src.id, statusId: status.id, statusName: status.name })
    setPendingError('')
  }

  const confirmPending = (picIds: string[]) => {
    if (!pending) return
    setPendingError('')
    if (pending.kind === 'single') {
      setStatus.mutate(
        { taskId: pending.taskId, statusId: pending.statusId, picIds },
        {
          onSuccess: () => setPending(null),
          onError: (err: unknown) => setPendingError(describeMoveError(err)),
        },
      )
    } else {
      bulkSetStatus.mutate(
        { taskIds: selected, statusId: pending.statusId, picIds },
        {
          onSuccess: (result) => {
            setPending(null)
            setSelected([])
            if (result.success_count < result.total) {
              setPendingError(`${result.success_count}/${result.total} task berhasil dipindah -- sisanya gagal (lihat detail per task).`)
            }
          },
          onError: () => setPendingError('Gagal memindahkan task terpilih.'),
        },
      )
    }
  }

  const quickMoves = (task: Task) => {
    const idx = sortedStatuses.findIndex((s) => s.id === task.status_id)
    if (idx === -1) return []
    const moves: { statusId: string; statusName: string; label: string }[] = []
    if (idx > 0 && !sortedStatuses[idx - 1].is_undefined)
      moves.push({ statusId: sortedStatuses[idx - 1].id, statusName: sortedStatuses[idx - 1].name, label: `← ${sortedStatuses[idx - 1].name}` })
    if (idx < sortedStatuses.length - 1 && !sortedStatuses[idx + 1].is_undefined)
      moves.push({ statusId: sortedStatuses[idx + 1].id, statusName: sortedStatuses[idx + 1].name, label: `${sortedStatuses[idx + 1].name} →` })
    return moves
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMineOnly((v) => !v)}
          className={cn(
            'font-mono text-[9.5px] uppercase tracking-[0.06em]',
            mineOnly ? 'border border-mint bg-mint/10 px-2.5 py-1.5 text-mint' : 'border border-line-strong px-2.5 py-1.5 text-text-muted',
          )}
        >
          {mineOnly ? '✓ Punya Saya' : 'Punya Saya'}
        </button>
        <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-text-dim">Kolom</span>
        {sortedStatuses.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => jumpToColumn(s.id)}
            className="border border-line-strong px-2 py-1 font-mono text-[8.5px] text-text-muted hover:text-text-bone"
          >
            {s.name}
          </button>
        ))}
        <span className="ml-auto font-mono text-[8.5px] text-text-dim">⇕ Seret kartu untuk memindah status</span>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 border border-signal bg-accent-wash px-3 py-2.5">
          <span className="font-mono text-[9.5px] text-signal">{selected.length} TASK DIPILIH · BULK ACTION</span>
          {sortedStatuses
            .filter((s) => !s.is_undefined)
            .map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setPending({ kind: 'bulk', statusId: s.id, statusName: s.name })
                  setPendingError('')
                }}
                className="border border-line-strong px-2 py-1 font-mono text-[9px] text-text-muted hover:border-signal hover:text-signal"
              >
                → {s.name}
              </button>
            ))}
          <button type="button" onClick={() => setSelected([])} className="ml-auto font-mono text-[9.5px] text-text-muted hover:text-text-bone">
            ✕ Batalkan Pilihan
          </button>
        </div>
      )}

      <div ref={trackRef} className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
        {columns.map(({ status, cards }) => (
          <div
            key={status.id}
            id={`kanban-col-${status.id}`}
            onDragOver={(e) => {
              e.preventDefault()
              setOverColumnId(status.id)
            }}
            onDragLeave={() => setOverColumnId((v) => (v === status.id ? null : v))}
            onDrop={onColumnDrop(status)}
            className={cn(
              'flex min-h-[120px] min-w-[220px] flex-col gap-2 border bg-raised-2 p-2.5',
              overColumnId === status.id && dragTaskId ? 'border-signal' : 'border-line',
            )}
          >
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-[9.5px] font-semibold uppercase text-text-bone">{status.name}</span>
              <span className="font-mono text-[9px] text-text-dim">{cards.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {cards
                .filter((t) => !mineOnly || isMine(t))
                .map((t) => {
                  const moves = quickMoves(t)
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDragTaskId(t.id)}
                      onDragEnd={() => {
                        setDragTaskId(null)
                        setOverColumnId(null)
                        setOverCardId(null)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        setOverCardId(t.id)
                        setOverSide(e.clientY - rect.top < rect.height / 2 ? 'before' : 'after')
                      }}
                      onDrop={onCardDrop(t)}
                      className={cn(
                        'flex cursor-grab flex-col gap-1.5 border bg-panel p-3 transition-shadow',
                        dragTaskId === t.id ? 'opacity-45' : 'opacity-100',
                        overCardId === t.id && dragTaskId && dragTaskId !== t.id
                          ? overSide === 'before'
                            ? 'border-line shadow-[inset_0_2px_0_0_var(--color-signal,orange)]'
                            : 'border-line shadow-[inset_0_-2px_0_0_var(--color-signal,orange)]'
                          : 'border-line',
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => toggleSelect(t.id)} className="font-mono text-[10px] text-text-muted hover:text-signal">
                          {selected.includes(t.id) ? '☑' : '☐'}
                        </button>
                        <span className="flex items-center gap-1 font-mono text-[8.5px] text-text-dim">
                          {t.is_blocked && <span title="Diblokir -- ada predecessor yang belum selesai">🔒</span>}
                          {t.task_code}
                        </span>
                        {isMine(t) && (
                          <span className="border border-mint px-1 py-0.5 font-mono text-[7.5px] font-semibold text-mint">SAYA</span>
                        )}
                        <span className={cn('ml-auto border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase', PRIORITY_TONE[t.priority])}>
                          {t.priority}
                        </span>
                      </div>
                      <div onClick={() => onOpenTask(t.id)} className="cursor-pointer text-[12px] leading-snug text-text-bone hover:text-signal">
                        {t.title}
                      </div>
                      {t.completeness === 'incomplete' && (
                        <div className="w-fit border border-amber px-1.5 py-0.5 font-mono text-[8px] text-amber">BELUM LENGKAP · STATUS TERKUNCI</div>
                      )}
                      {t.regression_count > 0 && (
                        <div className="w-fit border border-amber px-1.5 py-0.5 font-mono text-[8px] text-amber">↩ {t.regression_count}× regresi</div>
                      )}
                      <div className="flex items-center justify-between font-mono text-[9px] text-text-muted">
                        <span className="truncate">{t.assignees[0] ? t.assignees[0].display_name || t.assignees[0].email : '—'}</span>
                        <span>{t.due_date ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="border border-line-strong px-1.5 py-0.5 font-mono text-[8.5px] text-text-dim">SP {t.story_points ?? '?'}</span>
                        {moves.map((m) => (
                          <button
                            key={m.statusId}
                            type="button"
                            onClick={() => {
                              setPending({ kind: 'single', taskId: t.id, statusId: m.statusId, statusName: m.statusName })
                              setPendingError('')
                            }}
                            className="border border-line-strong px-1.5 py-0.5 font-mono text-[8px] text-text-dim hover:border-signal hover:text-signal"
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              {cards.length === 0 && <p className="border border-dashed border-line-strong p-4 text-center font-mono text-[8.5px] text-text-dim">Tidak ada task.</p>}
            </div>
          </div>
        ))}
      </div>

      <PicPickerModal
        open={pending !== null}
        title={pending ? `Pindahkan ke ${pending.statusName}` : ''}
        note={
          pending?.kind === 'bulk'
            ? `${selected.length} task akan dipindahkan sekaligus -- pilih PIC fase baru untuk semuanya.`
            : 'Pindah status wajib menetapkan PIC fase baru.'
        }
        members={members.data ?? []}
        onConfirm={confirmPending}
        onCancel={() => {
          setPending(null)
          setPendingError('')
        }}
        isPending={setStatus.isPending || bulkSetStatus.isPending}
        errorMessage={pendingError}
      />
    </div>
  )
}

function describeMoveError(err: unknown): string {
  const apiErr = err as { code?: string; details?: { blocking_tasks?: { task_code: string; title: string }[] } }
  if (apiErr.code === 'PIC_NOT_IN_GROUP') return 'PIC Group status ini belum memuat member yang Anda pilih. Minta Project Manager menambah anggota PIC Group.'
  if (apiErr.code === 'TASK_INCOMPLETE') return 'Task ini masih ditandai "Belum Lengkap" -- tandai Lengkap dulu sebelum mengubah status (kecuali ke BLOCKED).'
  if (apiErr.code === 'DEPENDENCY_HARD_BLOCK') {
    const names = (apiErr.details?.blocking_tasks ?? []).map((t) => `${t.task_code} (${t.title})`).join(', ')
    return `Task ini diblokir predecessor yang belum selesai: ${names || '-'}.`
  }
  return 'Gagal mengubah status task.'
}
