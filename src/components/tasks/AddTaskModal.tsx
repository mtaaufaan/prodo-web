import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useProjectMembers } from '@/features/project-members/hooks'
import { useCreateTask, useProjectSprints } from '@/features/tasks/hooks'
import { FIBONACCI_STORY_POINTS, type TaskPriority } from '@/features/tasks/types'
import { cn } from '@/lib/utils'

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical']
const PRIORITY_TONE: Record<TaskPriority, string> = {
  low: 'border-text-muted text-text-muted',
  medium: 'border-blue text-blue',
  high: 'border-amber text-amber',
  critical: 'border-destructive text-destructive',
}

interface AddTaskModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  projectName: string
  defaultSprintId?: string | null
}

// AddTaskModal (Task Management Core Phase 1, desain "PM Add Task.dc.html").
// Status AWAL selalu BACKLOG di Phase 1 (S4-13 AC) -- pemilihan status
// custom saat create BELUM dibangun (butuh daftar status per-project, di
// luar scope Phase 1 yang cuma status sistem level workspace).
export default function AddTaskModal({ open, onClose, projectId, projectName, defaultSprintId }: AddTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [storyPoints, setStoryPoints] = useState<number | null | undefined>(undefined)
  const [sprintId, setSprintId] = useState<string | null>(null)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [titleError, setTitleError] = useState(false)
  const [formError, setFormError] = useState('')

  const members = useProjectMembers(projectId)
  const sprints = useProjectSprints(projectId)
  const create = useCreateTask(projectId)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDueDate('')
    setEstimatedHours('')
    setStoryPoints(undefined)
    setSprintId(defaultSprintId ?? null)
    setAssigneeIds([])
    setTitleError(false)
    setFormError('')
    create.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset SEKALI saat modal dibuka, `create` stabil dari hook
  }, [open, defaultSprintId])

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
    setFormError('')
  }

  const onSave = () => {
    const trimmed = title.trim()
    if (trimmed.length < 3) {
      setTitleError(true)
      return
    }
    if (assigneeIds.length === 0) {
      setFormError('Pilih minimal satu assignee -- task tanpa penanggung jawab tidak dapat disimpan.')
      return
    }
    create.mutate(
      {
        title: trimmed,
        description: description.trim() || undefined,
        priority,
        due_date: dueDate,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        story_points: storyPoints ?? null,
        sprint_id: sprintId,
        assignee_ids: assigneeIds,
      },
      { onSuccess: onClose },
    )
  }

  const activeSprints = sprints.data ?? []

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Task Baru</DialogTitle>
          <p className="mt-1 text-sm text-text-muted">{projectName}</p>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-300px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-text-dim">JUDUL TASK · WAJIB</label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setTitleError(false)
              }}
              placeholder="Uji regresi modul login"
              className={cn(
                'w-full border bg-input-bg px-3 py-2.5 text-[13px] text-text-bone outline-none focus-visible:border-signal',
                titleError ? 'border-destructive' : 'border-line-strong',
              )}
            />
            {titleError && <p className="mt-1.5 text-[9.5px] text-destructive">⚠ Judul task minimal 3 karakter.</p>}
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-text-dim">DESKRIPSI · OPSIONAL</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cakupan, langkah verifikasi, tautan dokumen…"
              className="h-20 w-full resize-y border border-line-strong bg-input-bg px-3 py-2.5 text-[12.5px] leading-relaxed text-text-bone outline-none focus-visible:border-signal"
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
                      priority === p ? PRIORITY_TONE[p] + ' bg-signal/5' : 'border-line-strong text-text-muted',
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
                placeholder="8"
                className="w-full border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[11px] text-text-bone outline-none focus-visible:border-signal"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-text-dim">STORY POINT · OPSIONAL</label>
            <div className="flex flex-wrap gap-1.5">
              {[null, ...FIBONACCI_STORY_POINTS].map((v) => (
                <button
                  key={v ?? 'unset'}
                  type="button"
                  onClick={() => setStoryPoints(v)}
                  className={cn(
                    'min-w-[32px] border px-2 py-1.5 text-center font-mono text-[10.5px] font-semibold',
                    (storyPoints ?? null) === v ? 'border-signal bg-signal/10 text-signal' : 'border-line-strong text-text-muted',
                  )}
                >
                  {v ?? '?'}
                </button>
              ))}
            </div>
            <p className="mt-1.5 font-mono text-[8.5px] text-text-dim">"?" berarti belum diestimasi.</p>
          </div>

          <div>
            <label className="mb-1 block font-mono text-[9px] tracking-[0.14em] text-text-dim">ASSIGNEE · MINIMAL SATU</label>
            <p className="mb-2 font-mono text-[9px] leading-relaxed text-text-dim">
              Pembuat task otomatis menjadi PIC fase awal (Phase 2).
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(members.data ?? []).map((m) => {
                const on = assigneeIds.includes(m.user_id)
                return (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => toggleAssignee(m.user_id)}
                    className={cn(
                      'border px-2.5 py-1.5 font-mono text-[9.5px]',
                      on ? 'border-mint bg-mint/10 text-mint' : 'border-line-strong text-text-muted',
                    )}
                  >
                    {on ? '● ' : ''}
                    {m.display_name || m.email} <span className="text-text-dim">· {m.role}</span>
                  </button>
                )
              })}
              {members.data && members.data.length === 0 && (
                <p className="font-mono text-[9.5px] text-text-dim">Belum ada member project. Tambah lewat Kelola Member Project dulu.</p>
              )}
            </div>
          </div>

          {activeSprints.length > 0 && (
            <div>
              <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-text-dim">SPRINT</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSprintId(null)}
                  className={cn('border px-2.5 py-1.5 font-mono text-[9.5px]', sprintId === null ? 'border-signal bg-signal/10 text-signal' : 'border-line-strong text-text-muted')}
                >
                  Backlog (tanpa sprint)
                </button>
                {activeSprints.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSprintId(s.id)}
                    className={cn('border px-2.5 py-1.5 font-mono text-[9.5px]', sprintId === s.id ? 'border-signal bg-signal/10 text-signal' : 'border-line-strong text-text-muted')}
                  >
                    {s.name}
                    {s.is_active ? ' · AKTIF' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {formError && <p className="border border-destructive p-2.5 font-mono text-[10px] leading-relaxed text-destructive">⚠ {formError}</p>}
          {create.isError && <p className="text-[11px] text-destructive">Gagal membuat task.</p>}
        </div>

        <DialogFooter>
          <Button type="button" disabled={create.isPending} onClick={onSave} className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]">
            {create.isPending ? 'Menyimpan...' : 'Simpan Task'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
