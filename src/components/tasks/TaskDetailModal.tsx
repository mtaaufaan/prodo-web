import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { CustomStatus } from '@/features/tasks/types'
import { useDeleteTask, useSetTaskStatus, useTask, useUpdateTask } from '@/features/tasks/hooks'
import { FIBONACCI_STORY_POINTS, type TaskPriority } from '@/features/tasks/types'
import { cn } from '@/lib/utils'

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical']

interface TaskDetailModalProps {
  taskId: string | null
  onClose: () => void
  projectId: string
  statuses: CustomStatus[]
}

// TaskDetailModal (Task Management Core Phase 1). Versi DISEDERHANAKAN
// dari desain "PM Task Detail.dc.html" (panel raksasa dengan file upload,
// history, PIC handoff, drag-drop) -- Phase 1 cuma lihat+edit field dasar
// dan ganti status via chip (bukan drag board). PIC Handoff/attachment/
// history/dependency menyusul Phase 2-4, dicatat sebagai gap yang
// disengaja, bukan kelupaan.
export default function TaskDetailModal({ taskId, onClose, projectId, statuses }: TaskDetailModalProps) {
  const task = useTask(taskId)
  const update = useUpdateTask(projectId)
  const setStatus = useSetTaskStatus(projectId)
  const remove = useDeleteTask(projectId)

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [storyPoints, setStoryPoints] = useState<number | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (task.data) {
      setTitle(task.data.title)
      setPriority(task.data.priority)
      setDueDate(task.data.due_date ?? '')
      setEstimatedHours(task.data.estimated_hours != null ? String(task.data.estimated_hours) : '')
      setStoryPoints(task.data.story_points)
    }
    setEditing(false)
    setNotice('')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sinkron SEKALI saat task berganti (by id), bukan tiap refetch
  }, [task.data?.id, taskId])

  if (!taskId) return null

  const onSave = () => {
    if (!task.data) return
    update.mutate(
      {
        taskId,
        values: {
          title: title.trim(),
          priority,
          due_date: dueDate,
          estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
          story_points: storyPoints,
          sprint_id: task.data.sprint_id,
          assignee_ids: task.data.assignees.map((a) => a.user_id),
        },
      },
      { onSuccess: () => { setEditing(false); setNotice('Task diperbarui.') } },
    )
  }

  const onChangeStatus = (statusId: string) => {
    setStatus.mutate({ taskId, statusId }, { onSuccess: () => setNotice('Status task diperbarui.') })
  }

  const onDelete = () => {
    remove.mutate(taskId, { onSuccess: onClose })
  }

  return (
    <Dialog open={taskId !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{task.data?.task_code ?? '...'} · {task.data?.title ?? ''}</DialogTitle>
        </DialogHeader>

        {task.isLoading && <p className="px-5 py-5 text-sm text-text-muted">Memuat...</p>}

        {task.data && (
          <div className="flex max-h-[calc(100vh-300px)] flex-col gap-4 overflow-y-auto px-5 py-5">
            <div>
              <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-text-dim">STATUS</label>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={s.is_undefined || setStatus.isPending}
                    onClick={() => onChangeStatus(s.id)}
                    className={cn(
                      'border px-2.5 py-1.5 font-mono text-[9.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40',
                      s.id === task.data.status_id ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted hover:text-text-bone',
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {editing ? (
              <>
                <div>
                  <label className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-text-dim">JUDUL</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-line-strong bg-input-bg px-3 py-2.5 text-[13px] text-text-bone outline-none focus-visible:border-signal"
                  />
                </div>
                <div className="flex flex-wrap gap-3.5">
                  <div className="min-w-[180px] flex-1">
                    <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-text-dim">PRIORITY</label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={cn(
                            'border px-2.5 py-1.5 font-mono text-[9.5px] font-semibold uppercase',
                            priority === p ? 'border-signal bg-signal/10 text-signal' : 'border-line-strong text-text-muted',
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="w-[160px]">
                    <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-text-dim">DUE DATE</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[11px] text-text-bone outline-none focus-visible:border-signal"
                    />
                  </div>
                  <div className="w-[130px]">
                    <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-text-dim">ESTIMASI (JAM)</label>
                    <input
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[11px] text-text-bone outline-none focus-visible:border-signal"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-text-dim">STORY POINT</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[null, ...FIBONACCI_STORY_POINTS].map((v) => (
                      <button
                        key={v ?? 'unset'}
                        type="button"
                        onClick={() => setStoryPoints(v)}
                        className={cn(
                          'min-w-[32px] border px-2 py-1.5 text-center font-mono text-[10.5px] font-semibold',
                          storyPoints === v ? 'border-signal bg-signal/10 text-signal' : 'border-line-strong text-text-muted',
                        )}
                      >
                        {v ?? '?'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 font-mono text-[11px]">
                <div>
                  <div className="text-[9px] tracking-[0.1em] text-text-dim">PRIORITY</div>
                  <div className="mt-1 uppercase text-text-bone">{task.data.priority}</div>
                </div>
                <div>
                  <div className="text-[9px] tracking-[0.1em] text-text-dim">DUE DATE</div>
                  <div className="mt-1 text-text-bone">{task.data.due_date ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[9px] tracking-[0.1em] text-text-dim">ESTIMASI</div>
                  <div className="mt-1 text-text-bone">{task.data.estimated_hours ?? '—'} jam</div>
                </div>
                <div>
                  <div className="text-[9px] tracking-[0.1em] text-text-dim">STORY POINT</div>
                  <div className="mt-1 text-text-bone">{task.data.story_points ?? '?'}</div>
                </div>
                <div>
                  <div className="text-[9px] tracking-[0.1em] text-text-dim">SPRINT</div>
                  <div className="mt-1 text-text-bone">{task.data.sprint_name ?? 'Backlog'}</div>
                </div>
                <div>
                  <div className="text-[9px] tracking-[0.1em] text-text-dim">KELENGKAPAN</div>
                  <div className="mt-1 text-text-bone">{task.data.completeness === 'complete' ? 'Lengkap' : 'Belum Lengkap'}</div>
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 font-mono text-[9px] tracking-[0.14em] text-text-dim">ASSIGNEE</div>
              <div className="flex flex-wrap gap-1.5">
                {task.data.assignees.map((a) => (
                  <span key={a.user_id} className="border border-line-strong px-2.5 py-1.5 font-mono text-[9.5px] text-text-muted">
                    {a.display_name || a.email} <span className="text-text-dim">· {a.role}</span>
                  </span>
                ))}
              </div>
            </div>

            {notice && <p className="border border-mint p-2.5 font-mono text-[10px] text-mint">✓ {notice}</p>}
            {(update.isError || setStatus.isError) && <p className="text-[11px] text-destructive">Gagal menyimpan perubahan.</p>}
          </div>
        )}

        <DialogFooter>
          {editing ? (
            <>
              <Button type="button" disabled={update.isPending} onClick={onSave} className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]">
                {update.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
                Batal
              </Button>
            </>
          ) : (
            <>
              <Button type="button" onClick={() => setEditing(true)} className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]">
                ✎ Edit Task
              </Button>
              <Button type="button" variant="outline" onClick={onDelete} disabled={remove.isPending} className="border-destructive font-mono text-[10px] uppercase tracking-[0.06em] text-destructive">
                Hapus
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
                Tutup
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
