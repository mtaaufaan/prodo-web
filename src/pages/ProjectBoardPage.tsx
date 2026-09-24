import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import AddTaskModal from '@/components/tasks/AddTaskModal'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import { useProjects } from '@/features/projects/hooks'
import { useProjectSprints, useProjectTasks, useWorkspaceStatuses } from '@/features/tasks/hooks'

// ProjectBoardPage (Task Management Core Phase 1, desain "PM Board.dc.html").
// Kanban (Track S5, drag-drop+bulk+quick-move+filter -- lihat KanbanBoard.tsx)
// sudah lengkap. Daftar/Gantt/Riwayat MENYUSUL fase berikutnya (dikonfirmasi
// user: bangun berurutan dalam satu sesi, Kanban dulu) -- placeholder di
// bawah ini SEMENTARA, bukan gap yang disengaja permanen.
//
// Panel Sprint inline (dulu di sini, S4-10) DIHAPUS 2026-09-23 (Track S5,
// IG-92) -- digantikan halaman "Sprint" tersendiri (menu nav PM). Label
// "Sprint aktif" tetap dipertahankan di sini sebagai konteks cepat.
function ProjectBoardPageContent() {
  const { wsId, projectId } = useParams<{ wsId: string; projectId: string }>()
  const workspaceId = wsId ?? ''
  const pid = projectId ?? ''
  const { view, registerCta, query } = useOutletContext<WorkspaceOutletContext>()

  const projects = useProjects(workspaceId)
  const project = projects.data?.find((p) => p.id === pid) ?? null

  const statuses = useWorkspaceStatuses(workspaceId)
  const tasks = useProjectTasks(pid)
  const sprints = useProjectSprints(pid)

  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)

  useEffect(() => {
    registerCta(() => setAddTaskOpen(true))
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registerCta stabil dari useCallback shell
  }, [])

  const activeSprint = sprints.data?.find((s) => s.status === 'active') ?? null
  const tab = view === 'Daftar' || view === 'Gantt' || view === 'Riwayat' ? view : 'Kanban'

  // query (IG-96): search topbar shell -- filter judul task client-side,
  // sama pola ProjectListPage/WorkspaceMembersPage.
  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !tasks.data) return tasks.data
    return tasks.data.filter((t) => t.title.toLowerCase().includes(q))
  }, [tasks.data, query])

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3.5 p-6">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
          {project?.code} · {project?.name ?? '...'}
        </div>
        <div className="mt-1 font-mono text-[10px] text-text-muted">
          Sprint aktif: {activeSprint ? activeSprint.name : 'Belum ada sprint aktif'}
        </div>
      </div>

      {(statuses.isLoading || tasks.isLoading) && <p className="text-sm text-text-muted">Memuat...</p>}
      {(statuses.isError || tasks.isError) && <p className="text-sm text-destructive">Gagal memuat papan task.</p>}

      {statuses.data && filteredTasks && tab === 'Kanban' && (
        <KanbanBoard projectId={pid} statuses={statuses.data} tasks={filteredTasks} onOpenTask={setDetailTaskId} />
      )}
      {tab === 'Daftar' && <p className="font-mono text-[10.5px] text-text-dim">Tampilan Daftar menyusul.</p>}
      {tab === 'Gantt' && <p className="font-mono text-[10.5px] text-text-dim">Tampilan Gantt menyusul.</p>}
      {tab === 'Riwayat' && <p className="font-mono text-[10.5px] text-text-dim">Riwayat pergerakan board menyusul.</p>}

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
