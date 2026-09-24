import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAssignTasksToSprint, useCreateSprint, useProjectSprints, useProjectTasks } from '@/features/tasks/hooks'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

// AddSprintModal (Track S5, menu "Sprint" PM, implementation_gaps.md
// IG-92) -- dibangun mengikuti "PM Add Sprint.dc.html" (Claude Design):
// nama opsional (auto-generate "Sprint N" di backend kalau dikosongkan),
// tanggal mulai/selesai WAJIB (AC US-013) dengan preset durasi cepat 1/2
// pekan, goal opsional, dan checklist "Tarik Task dari Backlog" (task
// BACKLOG yang belum masuk sprint manapun) -- dua request berurutan
// persis mock (createSprint lalu assignTasksToSprint), bukan satu
// endpoint gabungan. Modal CREATE -- tutup langsung setelah sukses, tidak
// perlu notice dirty/saved (beda dari modal Kelola).
interface AddSprintModalProps {
  projectId: string
  open: boolean
  onClose: () => void
}

function todayISO(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function addDaysISO(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function AddSprintModal({ projectId, open, onClose }: AddSprintModalProps) {
  const [name, setName] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [goal, setGoal] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [formError, setFormError] = useState('')

  const sprints = useProjectSprints(projectId)
  const tasks = useProjectTasks(projectId)
  const createSprint = useCreateSprint(projectId)
  const assignTasks = useAssignTasksToSprint(projectId)

  const nextName = useMemo(() => `Sprint ${(sprints.data?.length ?? 0) + 1}`, [sprints.data])
  const backlogTasks = useMemo(() => (tasks.data ?? []).filter((t) => t.status_name === 'BACKLOG' && !t.sprint_id), [tasks.data])

  const handleClose = () => {
    setName('')
    setStart('')
    setEnd('')
    setGoal('')
    setPicked([])
    setFormError('')
    onClose()
  }

  const applyPreset = (days: number) => {
    const base = start || todayISO()
    setStart(base)
    setEnd(addDaysISO(base, days))
  }

  const togglePicked = (taskId: string) => {
    setPicked((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]))
  }

  const handleSave = () => {
    setFormError('')
    if (!start || !end) {
      setFormError('Tanggal mulai dan selesai wajib diisi -- gunakan durasi cepat bila perlu.')
      return
    }
    if (end < start) {
      setFormError('Tanggal selesai tidak boleh sebelum tanggal mulai.')
      return
    }
    createSprint.mutate(
      { name: name.trim(), start_date: start, end_date: end, goal: goal.trim() || undefined },
      {
        onSuccess: (sprint) => {
          if (picked.length > 0) {
            assignTasks.mutate({ sprintId: sprint.id, taskIds: picked })
          }
          handleClose()
        },
        onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Gagal membuat sprint.'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sprint Baru</DialogTitle>
          <div className="mt-1.5 text-[13px] text-text-muted">
            Sprint dibuat dengan status BACKLOG dan bisa dimulai kapan saja. Hanya satu sprint yang boleh berstatus
            AKTIF per project -- memulai sprint baru akan menutup sprint yang sedang berjalan.
          </div>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          {formError && (
            <div className="border border-destructive px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">
              ⚠ {formError}
            </div>
          )}

          <div>
            <Label htmlFor="sprint-name" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              Nama Sprint
            </Label>
            <Input id="sprint-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={`${nextName} · nama fase`} />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="min-w-[150px] flex-1">
              <Label htmlFor="sprint-start" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                Tanggal Mulai
              </Label>
              <Input id="sprint-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="min-w-[150px] flex-1">
              <Label htmlFor="sprint-end" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                Tanggal Selesai
              </Label>
              <Input id="sprint-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div className="w-[120px]">
              <Label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Durasi Cepat</Label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(7)}
                  className="border border-line-strong px-2 py-2 font-mono text-[9.5px] text-text-muted hover:text-text-bone"
                >
                  1 Pekan
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(14)}
                  className="border border-line-strong px-2 py-2 font-mono text-[9.5px] text-text-muted hover:text-text-bone"
                >
                  2 Pekan
                </button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="sprint-goal" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              Sprint Goal · Opsional
            </Label>
            <textarea
              id="sprint-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Sasaran yang ingin dicapai pada akhir sprint..."
              className="h-[72px] w-full resize-y border border-line-strong bg-input-bg px-3 py-2.5 text-[12.5px] text-text-bone outline-none focus-visible:border-signal"
            />
          </div>

          <div>
            <Label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              Tarik Task dari Backlog · Opsional
            </Label>
            {backlogTasks.length === 0 ? (
              <div className="border border-dashed border-line-strong px-3.5 py-3 font-mono text-[10px] leading-relaxed text-text-muted">
                Tidak ada task berstatus BACKLOG yang belum masuk sprint.
              </div>
            ) : (
              <div className="flex max-h-[170px] flex-col overflow-y-auto border border-line">
                {backlogTasks.map((t) => {
                  const on = picked.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => togglePicked(t.id)}
                      className={cn(
                        'flex items-center gap-2.5 border-t border-line-subtle px-3 py-2.5 text-left first:border-t-0',
                        on && 'bg-accent-wash',
                      )}
                    >
                      <span className={cn('font-mono text-[11px]', on ? 'text-signal' : 'text-text-muted')}>{on ? '☑' : '☐'}</span>
                      <span className="font-mono text-[9px] text-text-muted">{t.task_code}</span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-text-body">{t.title}</span>
                      <span className="font-mono text-[8.5px] font-semibold uppercase text-text-dim">{t.priority}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
          <Button onClick={handleSave} disabled={createSprint.isPending} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            {createSprint.isPending ? 'Menyimpan...' : 'Simpan Sprint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
