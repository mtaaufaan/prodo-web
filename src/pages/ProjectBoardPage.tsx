import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import AddTaskModal from '@/components/tasks/AddTaskModal'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { useProjects } from '@/features/projects/hooks'
import {
  useCompleteSprint,
  useCreateSprint,
  useProjectSprints,
  useProjectTasks,
  useStartSprint,
  useWorkspaceStatuses,
} from '@/features/tasks/hooks'
import type { Task, TaskPriority } from '@/features/tasks/types'
import { cn } from '@/lib/utils'

const PRIORITY_TONE: Record<TaskPriority, string> = {
  low: 'border-text-muted text-text-muted',
  medium: 'border-blue text-blue',
  high: 'border-amber text-amber',
  critical: 'border-destructive text-destructive',
}

function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const firstAssignee = task.assignees[0]
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full border border-line bg-panel p-3 text-left hover:border-signal"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 font-mono text-[8.5px] text-text-dim">
          {task.is_blocked && <span title="Diblokir -- ada predecessor yang belum selesai">🔒</span>}
          {task.task_code}
        </span>
        <span className={cn('border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase', PRIORITY_TONE[task.priority])}>
          {task.priority}
        </span>
      </div>
      <div className="mt-1.5 text-[12.5px] text-text-bone">{task.title}</div>
      <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-text-muted">
        <span className="truncate">{firstAssignee ? firstAssignee.display_name || firstAssignee.email : '—'}</span>
        <span>{task.due_date ?? '—'}</span>
      </div>
      {task.story_points != null && (
        <div className="mt-1.5 inline-block border border-line-strong px-1.5 py-0.5 font-mono text-[8.5px] text-text-dim">
          SP {task.story_points}
        </div>
      )}
    </button>
  )
}

// ProjectBoardPage (Task Management Core Phase 1, desain "PM Board.dc.html"
// disederhanakan). Kanban KOLOM=status, tanpa drag-drop -- pindah status
// lewat TaskDetailModal (chip klik). View List/Gantt dari desain asli
// BELUM dibangun (Phase 1 cuma Kanban) -- dicatat sebagai gap disengaja.
function ProjectBoardPageContent() {
  const { wsId, projectId } = useParams<{ wsId: string; projectId: string }>()
  const workspaceId = wsId ?? ''
  const pid = projectId ?? ''

  const projects = useProjects(workspaceId)
  const project = projects.data?.find((p) => p.id === pid) ?? null

  const statuses = useWorkspaceStatuses(workspaceId)
  const tasks = useProjectTasks(pid)
  const sprints = useProjectSprints(pid)

  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [newSprintName, setNewSprintName] = useState('')
  const [sprintPanelOpen, setSprintPanelOpen] = useState(false)

  const createSprint = useCreateSprint(pid)
  const startSprint = useStartSprint(pid)
  const completeSprint = useCompleteSprint(pid)

  const activeSprint = sprints.data?.find((s) => s.is_active) ?? null

  const columns = useMemo(() => {
    const list = statuses.data ?? []
    const taskList = tasks.data ?? []
    return list.map((s) => ({ status: s, tasks: taskList.filter((t) => t.status_id === s.id) }))
  }, [statuses.data, tasks.data])

  const onCreateSprint = () => {
    const name = newSprintName.trim()
    if (!name) return
    createSprint.mutate({ name }, { onSuccess: () => setNewSprintName('') })
  }

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
            {project?.code} · {project?.name ?? '...'}
          </div>
          <div className="mt-1 font-mono text-[10px] text-text-muted">
            Sprint aktif: {activeSprint ? activeSprint.name : 'Belum ada sprint aktif'}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setSprintPanelOpen((v) => !v)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Sprint
          </Button>
          <Button type="button" onClick={() => setAddTaskOpen(true)} className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]">
            + Task
          </Button>
        </div>
      </div>

      {sprintPanelOpen && (
        <div className="border border-line bg-panel p-4">
          <div className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Sprint</div>
          <div className="flex flex-col gap-2">
            {(sprints.data ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 border border-line-strong px-3 py-2">
                <div>
                  <div className="text-[12px] text-text-bone">{s.name}</div>
                  <div className="font-mono text-[9px] text-text-muted">
                    {s.start_date ?? '—'} – {s.end_date ?? '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('font-mono text-[9px] font-semibold', s.is_active ? 'text-mint' : 'text-text-muted')}>
                    {s.is_active ? '● AKTIF' : 'NONAKTIF'}
                  </span>
                  {!s.is_active && (
                    <button type="button" onClick={() => startSprint.mutate(s.id)} className="font-mono text-[9.5px] text-signal">
                      Mulai
                    </button>
                  )}
                  {s.is_active && (
                    <button type="button" onClick={() => completeSprint.mutate(s.id)} className="font-mono text-[9.5px] text-amber">
                      Selesaikan
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newSprintName}
                onChange={(e) => setNewSprintName(e.target.value)}
                placeholder="Nama sprint baru"
                className="flex-1 border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[10.5px] text-text-bone outline-none focus-visible:border-signal"
              />
              <button
                type="button"
                onClick={onCreateSprint}
                disabled={createSprint.isPending}
                className="border border-signal px-3 py-2 font-mono text-[9.5px] font-bold uppercase text-signal"
              >
                + Sprint
              </button>
            </div>
          </div>
        </div>
      )}

      {(statuses.isLoading || tasks.isLoading) && <p className="text-sm text-text-muted">Memuat...</p>}
      {(statuses.isError || tasks.isError) && <p className="text-sm text-destructive">Gagal memuat papan task.</p>}

      {statuses.data && (
        <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-3 lg:grid-cols-5">
          {columns.map(({ status, tasks: colTasks }) => (
            <div key={status.id} className="flex min-w-[220px] flex-col gap-2 border border-line bg-raised-2 p-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="font-mono text-[9.5px] font-semibold uppercase text-text-bone">{status.name}</span>
                <span className="font-mono text-[9px] text-text-dim">{colTasks.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {colTasks.map((t) => (
                  <TaskCard key={t.id} task={t} onOpen={() => setDetailTaskId(t.id)} />
                ))}
                {colTasks.length === 0 && <p className="px-1 py-3 text-center font-mono text-[9px] text-text-dim">Tidak ada task.</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddTaskModal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        projectId={pid}
        projectName={project?.name ?? ''}
        defaultSprintId={activeSprint?.id ?? null}
      />
      <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} projectId={pid} statuses={statuses.data ?? []} />
    </div>
  )
}

export default function ProjectBoardPage() {
  return (
    <ErrorBoundary>
      <ProjectBoardPageContent />
    </ErrorBoundary>
  )
}
