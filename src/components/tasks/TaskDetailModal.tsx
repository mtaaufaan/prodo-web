import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useProjectMembers } from '@/features/project-members/hooks'
import {
  useAcknowledgePic,
  useAddDependency,
  useDeleteTask,
  usePicHistory,
  useProjectTasks,
  useRemoveDependency,
  useSetCompleteness,
  useSetTaskStatus,
  useTask,
  useTaskDependencies,
  useUpdateTask,
} from '@/features/tasks/hooks'
import { FIBONACCI_STORY_POINTS, type CustomStatus, type TaskPriority } from '@/features/tasks/types'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical']

interface TaskDetailModalProps {
  taskId: string | null
  onClose: () => void
  projectId: string
  statuses: CustomStatus[]
}

// TaskDetailModal (Task Management Core Phase 1/2/3). Versi DISEDERHANAKAN
// dari desain "PM Task Detail.dc.html" (panel raksasa dengan file upload,
// history, drag-drop) -- lihat+edit field dasar, ganti status via chip +
// pilih PIC (Phase 2, S4-31/32) + riwayat PIC, toggle kelengkapan (Phase 3,
// S4-44/45), dan dependency Finish-to-Start (Phase 3, S4-51/52 --
// "autocomplete" disederhanakan jadi <select> native atas daftar task
// project yang sudah di-fetch, bukan widget pencarian terpisah).
// Attachment/story-point-permission-gate/time-tracking menyusul Phase 4,
// dicatat sebagai gap yang disengaja, bukan kelupaan.
export default function TaskDetailModal({ taskId, onClose, projectId, statuses }: TaskDetailModalProps) {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const task = useTask(taskId)
  const members = useProjectMembers(projectId)
  const projectTasks = useProjectTasks(projectId)
  const update = useUpdateTask(projectId)
  const setStatus = useSetTaskStatus(projectId)
  const remove = useDeleteTask(projectId)
  const acknowledge = useAcknowledgePic(taskId ?? '')
  const picHistory = usePicHistory(taskId)
  const setCompleteness = useSetCompleteness(projectId)
  const dependencies = useTaskDependencies(taskId)
  const addDependency = useAddDependency(projectId)
  const removeDependency = useRemoveDependency(projectId)

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [storyPoints, setStoryPoints] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)
  const [picSelection, setPicSelection] = useState<string[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [picError, setPicError] = useState('')
  const [depCandidateId, setDepCandidateId] = useState('')
  const [depError, setDepError] = useState('')

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
    setPendingStatusId(null)
    setPicSelection([])
    setPicError('')
    setHistoryOpen(false)
    setDepCandidateId('')
    setDepError('')
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

  // openPicPicker -- klik chip status membuka panel pilih PIC (S4-31/32:
  // ganti status SELALU butuh PIC baru), bukan langsung berpindah seperti
  // Phase 1.
  const openPicPicker = (statusId: string) => {
    setPendingStatusId(statusId)
    setPicSelection([])
    setPicError('')
  }

  const togglePic = (userId: string) => {
    setPicSelection((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
    setPicError('')
  }

  const onConfirmMove = () => {
    if (!pendingStatusId) return
    if (picSelection.length === 0) {
      setPicError('Pilih minimal satu PIC untuk fase status baru ini.')
      return
    }
    setStatus.mutate(
      { taskId, statusId: pendingStatusId, picIds: picSelection },
      {
        onSuccess: () => {
          setNotice('Status task diperbarui dan PIC fase baru ditetapkan.')
          setPendingStatusId(null)
          setPicSelection([])
        },
        onError: (err: unknown) => {
          const apiErr = err as { code?: string; details?: { blocking_tasks?: { task_code: string; title: string }[] } }
          if (apiErr.code === 'PIC_NOT_IN_GROUP') {
            setPicError('PIC Group status ini belum memuat member yang Anda pilih. Minta Project Manager menambah anggota PIC Group.')
          } else if (apiErr.code === 'TASK_INCOMPLETE') {
            setPicError('Task ini masih ditandai "Belum Lengkap" -- tandai Lengkap dulu sebelum mengubah status (kecuali ke BLOCKED).')
          } else if (apiErr.code === 'DEPENDENCY_HARD_BLOCK') {
            const names = (apiErr.details?.blocking_tasks ?? []).map((t) => `${t.task_code} (${t.title})`).join(', ')
            setPicError(`Task ini diblokir predecessor yang belum selesai: ${names || '-'}.`)
          } else {
            setPicError('Gagal mengubah status task.')
          }
        },
      },
    )
  }

  const onDelete = () => {
    remove.mutate(taskId, { onSuccess: onClose })
  }

  // onAddDependency -- S4-47/51/52: backend deteksi circular (409
  // CIRCULAR_DEPENDENCY dengan cycle_path) -- FE TIDAK menghitung ulang
  // graph di client, cukup tampilkan pesan dari server.
  const onAddDependency = () => {
    if (!depCandidateId) return
    addDependency.mutate(
      { taskId, predecessorTaskId: depCandidateId },
      {
        onSuccess: () => setDepCandidateId(''),
        onError: (err: unknown) => {
          const apiErr = err as { code?: string; details?: { cycle_path?: string[] } }
          if (apiErr.code === 'CIRCULAR_DEPENDENCY') {
            setDepError(`Menutup lingkaran: ${(apiErr.details?.cycle_path ?? []).join(' → ')}`)
          } else if (apiErr.code === 'DEPENDENCY_ALREADY_EXISTS') {
            setDepError('Dependency ini sudah ada.')
          } else {
            setDepError('Gagal menambah dependency.')
          }
        },
      },
    )
  }

  const activePics = task.data?.active_pics ?? []
  const myPendingAck = activePics.find((p) => p.user_id === currentUserId && p.acknowledged_at === null)
  const isCreatorOrActivePic = task.data != null && (task.data.created_by === currentUserId || activePics.some((p) => p.user_id === currentUserId))
  const showCompletenessToggle = task.data?.status_name === 'BACKLOG' && isCreatorOrActivePic
  const predecessors = dependencies.data?.predecessors ?? []
  const successors = dependencies.data?.successors ?? []
  const linkedTaskIds = new Set([taskId, ...predecessors.map((p) => p.task_id)])
  const dependencyCandidates = (projectTasks.data ?? []).filter((t) => !linkedTaskIds.has(t.id))

  return (
    <Dialog open={taskId !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle>
            {task.data?.is_blocked && <span title="Diblokir -- ada predecessor yang belum selesai">🔒 </span>}
            {task.data?.task_code ?? '...'} · {task.data?.title ?? ''}
          </DialogTitle>
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
                    disabled={s.is_undefined}
                    onClick={() => openPicPicker(s.id)}
                    className={cn(
                      'border px-2.5 py-1.5 font-mono text-[9.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40',
                      s.id === task.data.status_id ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted hover:text-text-bone',
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              {pendingStatusId && (
                <div className="mt-3 border border-amber bg-amber/5 p-3">
                  <div className="mb-2 font-mono text-[8.5px] tracking-[0.14em] text-amber">PILIH PIC FASE</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(members.data ?? []).map((m) => {
                      const on = picSelection.includes(m.user_id)
                      return (
                        <button
                          key={m.user_id}
                          type="button"
                          onClick={() => togglePic(m.user_id)}
                          className={cn(
                            'border px-2.5 py-1.5 font-mono text-[9.5px]',
                            on ? 'border-mint bg-mint/10 text-mint' : 'border-line-strong text-text-muted',
                          )}
                        >
                          {on ? '● ' : ''}
                          {m.display_name || m.email}
                        </button>
                      )
                    })}
                  </div>
                  {picError && <p className="mt-2 text-[10px] text-destructive">⚠ {picError}</p>}
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={onConfirmMove}
                      disabled={setStatus.isPending}
                      className="border border-amber px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase text-amber"
                    >
                      Pindahkan &amp; Tetapkan PIC
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingStatusId(null)}
                      className="border border-line-strong px-3 py-1.5 font-mono text-[9.5px] uppercase text-text-muted"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
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
                  {showCompletenessToggle ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCompleteness.mutate({
                          taskId,
                          completeness: task.data!.completeness === 'complete' ? 'incomplete' : 'complete',
                        })
                      }
                      disabled={setCompleteness.isPending}
                      className={cn(
                        'mt-1 border px-2 py-1 font-mono text-[10.5px] font-semibold',
                        task.data.completeness === 'complete' ? 'border-mint text-mint' : 'border-amber text-amber',
                      )}
                    >
                      {task.data.completeness === 'complete' ? '✓ Lengkap' : '○ Belum Lengkap'}
                    </button>
                  ) : (
                    <div className="mt-1 text-text-bone">{task.data.completeness === 'complete' ? 'Lengkap' : 'Belum Lengkap'}</div>
                  )}
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

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[9px] tracking-[0.14em] text-text-dim">PIC AKTIF</span>
                <button type="button" onClick={() => setHistoryOpen((v) => !v)} className="font-mono text-[9px] text-text-muted hover:text-signal">
                  {historyOpen ? '▴ Tutup riwayat' : '▾ Riwayat PIC'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activePics.map((p) => (
                  <span
                    key={p.id}
                    className={cn(
                      'border px-2.5 py-1.5 font-mono text-[9.5px]',
                      p.acknowledged_at ? 'border-mint text-mint' : 'border-amber text-amber',
                    )}
                  >
                    {p.user_name || p.user_email} · {p.acknowledged_at ? 'AKTIF' : 'PENDING'}
                  </span>
                ))}
                {activePics.length === 0 && <span className="font-mono text-[9.5px] text-text-dim">Tidak ada PIC aktif.</span>}
              </div>
              {myPendingAck && (
                <Button
                  type="button"
                  onClick={() => acknowledge.mutate(undefined, { onSuccess: () => setNotice('Serah terima PIC dikonfirmasi.') })}
                  disabled={acknowledge.isPending}
                  className="mt-2.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.06em]"
                >
                  ✓ Konfirmasi Serah Terima PIC
                </Button>
              )}
              {historyOpen && (
                <div className="mt-2.5 flex flex-col gap-1.5 border-t border-line pt-2.5">
                  {(picHistory.data ?? []).map((p) => (
                    <div key={p.id} className="flex items-center justify-between font-mono text-[9px] text-text-muted">
                      <span>{p.status_name} · {p.user_name || p.user_email}</span>
                      <span className={p.is_active ? 'text-mint' : 'text-text-dim'}>
                        {p.acknowledged_at ? 'Acknowledged' : p.is_active ? 'Pending' : 'Non-aktif'}
                      </span>
                    </div>
                  ))}
                  {(picHistory.data ?? []).length === 0 && <p className="font-mono text-[9px] text-text-dim">Belum ada riwayat.</p>}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 font-mono text-[9px] tracking-[0.14em] text-text-dim">DEPENDENCY (FINISH-TO-START)</div>
              <div className="flex flex-col gap-2">
                <div>
                  <div className="mb-1 font-mono text-[8.5px] text-text-dim">MENUNGGU SELESAI (PREDECESSOR)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {predecessors.map((p) => (
                      <span key={p.task_id} className={cn('flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px]', p.status === 'DONE' ? 'border-mint text-mint' : 'border-amber text-amber')}>
                        {p.task_code ?? p.title} · {p.status}
                        <button type="button" onClick={() => removeDependency.mutate({ taskId, predecessorTaskId: p.task_id })} className="text-text-dim hover:text-destructive">
                          ✕
                        </button>
                      </span>
                    ))}
                    {predecessors.length === 0 && <span className="font-mono text-[9px] text-text-dim">Tidak ada predecessor.</span>}
                  </div>
                </div>
                <div>
                  <div className="mb-1 font-mono text-[8.5px] text-text-dim">MEMBLOKIR (SUCCESSOR)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {successors.map((s) => (
                      <span key={s.task_id} className="border border-line-strong px-2 py-1 font-mono text-[9px] text-text-muted">
                        {s.task_code ?? s.title} · {s.status}
                      </span>
                    ))}
                    {successors.length === 0 && <span className="font-mono text-[9px] text-text-dim">Tidak memblokir task lain.</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={depCandidateId}
                    onChange={(e) => { setDepCandidateId(e.target.value); setDepError('') }}
                    className="flex-1 border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[10.5px] text-text-bone outline-none focus-visible:border-signal"
                  >
                    <option value="">Pilih task predecessor...</option>
                    {dependencyCandidates.map((t) => (
                      <option key={t.id} value={t.id}>{t.task_code ?? t.title} · {t.title}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onAddDependency}
                    disabled={!depCandidateId || addDependency.isPending}
                    className="border border-signal px-3 py-2 font-mono text-[9.5px] font-bold uppercase text-signal disabled:opacity-40"
                  >
                    + Dependency
                  </button>
                </div>
                {depError && <p className="text-[10px] text-destructive">⚠ {depError}</p>}
              </div>
            </div>

            {notice && <p className="border border-mint p-2.5 font-mono text-[10px] text-mint">✓ {notice}</p>}
            {(update.isError) && <p className="text-[11px] text-destructive">Gagal menyimpan perubahan.</p>}
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
