import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import AddSprintModal from '@/components/sprints/AddSprintModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import {
  useCompleteSprint,
  useProjectSprints,
  useProjectTasks,
  useReopenSprint,
  useSprintSummary,
  useStartSprint,
} from '@/features/tasks/hooks'
import type { Sprint, Task } from '@/features/tasks/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10
const STATUS_LABEL: Record<Sprint['status'], string> = { active: 'AKTIF', backlog: 'BACKLOG', done: 'SELESAI' }
const STATUS_RANK: Record<Sprint['status'], number> = { active: 0, backlog: 1, done: 2 }
const VIEW_TO_STATUS: Record<string, Sprint['status'] | null> = { Semua: null, Aktif: 'active', Backlog: 'backlog', Selesai: 'done' }

function isOverdue(t: Task) {
  return t.due_date != null && t.due_date < new Date().toISOString().slice(0, 10) && t.status_name !== 'DONE'
}

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('id-ID') : '—'
}

function SprintCard({ sprint, tasksInSprint }: { sprint: Sprint; tasksInSprint: Task[] }) {
  const startSprint = useStartSprint(sprint.project_id)
  const completeSprint = useCompleteSprint(sprint.project_id)
  const reopenSprint = useReopenSprint(sprint.project_id)
  const summary = useSprintSummary(sprint.id)

  const total = tasksInSprint.length
  const done = tasksInSprint.filter((t) => t.status_name === 'DONE').length
  const blocked = tasksInSprint.filter((t) => t.status_name === 'BLOCKED').length
  const inProgress = total - done - blocked
  const overdue = tasksInSprint.filter(isOverdue)

  const pct = (n: number) => (total ? (n / total) * 100 : 0)
  const sp = summary.data
  const spPct = sp && sp.total_story_points ? Math.round((sp.done_story_points / sp.total_story_points) * 100) : 0

  return (
    <div className="flex flex-col gap-3 border border-line bg-panel p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className={cn('text-[13.5px] font-semibold', sprint.status === 'done' ? 'text-text-muted' : 'text-text-bone')}>{sprint.name}</div>
          <div className="mt-1 font-mono text-[8.5px] text-text-dim">
            {formatDate(sprint.start_date)} → {formatDate(sprint.end_date)} · {total} TASK
          </div>
          {sprint.goal && <div className="mt-1.5 text-[11.5px] text-text-muted">{sprint.goal}</div>}
        </div>
        <span
          className={cn(
            'whitespace-nowrap border px-1.5 py-0.5 font-mono text-[9px] font-semibold',
            sprint.status === 'active' ? 'border-mint text-mint' : sprint.status === 'done' ? 'border-line-strong text-text-dim' : 'border-blue text-blue',
          )}
        >
          {STATUS_LABEL[sprint.status]}
        </span>
      </div>

      <div>
        <div className="mb-1.5 font-mono text-[8.5px] text-text-dim">
          {done} / {total} TASK SELESAI
        </div>
        <div className="flex h-2 overflow-hidden bg-raised-1">
          <span className="block bg-mint" style={{ width: `${pct(done)}%` }} />
          <span className="block bg-blue" style={{ width: `${pct(inProgress)}%` }} />
          <span className="block bg-destructive" style={{ width: `${pct(blocked)}%` }} />
        </div>
        <div className="mt-1.5 flex gap-3 font-mono text-[8px] text-text-dim">
          <span className="text-mint">■ {done} DONE</span>
          <span className="text-blue">■ {inProgress} BERJALAN</span>
          <span className="text-destructive">■ {blocked} BLOCKED</span>
        </div>
      </div>

      <div className="border border-line-strong bg-raised-2 p-3">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-[8px] tracking-[0.14em] text-text-dim">KAPASITAS STORY POINT</span>
          <span className="ml-auto font-mono text-[8.5px] text-text-dim">{sp && sp.total_story_points ? `${spPct}% TERSERAP` : 'BELUM ADA SP'}</span>
        </div>
        {sp && (
          <>
            <div className="mt-2 flex gap-3.5">
              <div>
                <div className="font-mono text-[8px] text-text-dim">SP TOTAL</div>
                <div className="font-mono text-[13px] font-semibold text-violet">{sp.total_story_points}</div>
              </div>
              <div>
                <div className="font-mono text-[8px] text-text-dim">SP SELESAI</div>
                <div className="font-mono text-[13px] font-semibold text-mint">{sp.done_story_points}</div>
              </div>
              <div>
                <div className="font-mono text-[8px] text-text-dim">SP TERSISA</div>
                <div className="font-mono text-[13px] font-semibold text-text-bone">{sp.left_story_points}</div>
              </div>
            </div>
            <div className="mt-2 h-1.5 bg-raised-1">
              <div className="h-full bg-violet" style={{ width: `${Math.min(100, spPct)}%` }} />
            </div>
            {sp.unestimated_count > 0 && (
              <div className="mt-1.5 font-mono text-[8px] text-text-dim">{sp.unestimated_count} task masih "?" dan dihitung 0 pada kapasitas.</div>
            )}
          </>
        )}
      </div>

      {overdue.length > 0 && (
        <div className="border border-amber px-2.5 py-2 font-mono text-[9px] leading-relaxed text-amber">
          ⚠ {overdue.length} task melewati due date: {overdue.map((t) => t.task_code).join(', ')} -- pertimbangkan pindah sprint atau eskalasi.
        </div>
      )}

      <div className="flex gap-3">
        {sprint.status === 'backlog' && (
          <button
            type="button"
            onClick={() => startSprint.mutate(sprint.id)}
            disabled={startSprint.isPending}
            className="font-mono text-[10px] text-mint"
          >
            ▶ MULAI SPRINT
          </button>
        )}
        {sprint.status === 'active' && (
          <button
            type="button"
            onClick={() => completeSprint.mutate(sprint.id)}
            disabled={completeSprint.isPending}
            className="font-mono text-[10px] text-amber"
          >
            ■ TUTUP SPRINT
          </button>
        )}
        {sprint.status === 'done' && (
          <button
            type="button"
            onClick={() => reopenSprint.mutate(sprint.id)}
            disabled={reopenSprint.isPending}
            className="font-mono text-[10px] text-blue"
          >
            ↺ BUKA KEMBALI
          </button>
        )}
      </div>
    </div>
  )
}

// SprintPage (Track S5, menu "Sprint" PM, implementation_gaps.md IG-92)
// -- dibangun mengikuti "PM Sprint.dc.html" (Claude Design). Filter
// PROJECT dari desain SENGAJA tidak diduplikasi di sini -- sudah ada
// switcher "PROJECT AKTIF" global di sidebar (master frame IG-90).
// Paginasi "Grid 1" (10/halaman, lompat halaman) pola sama
// AwAuditTrailPage.
function SprintPageContent() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = projectId ?? ''
  const { view, registerCta } = useOutletContext<WorkspaceOutletContext>()

  const sprints = useProjectSprints(pid)
  const tasks = useProjectTasks(pid)
  const [addOpen, setAddOpen] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    registerCta(() => setAddOpen(true))
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tasksBySprintId = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks.data ?? []) {
      if (!t.sprint_id) continue
      const list = map.get(t.sprint_id) ?? []
      list.push(t)
      map.set(t.sprint_id, list)
    }
    return map
  }, [tasks.data])

  const filteredSprints = useMemo(() => {
    const wantStatus = VIEW_TO_STATUS[view] ?? null
    let rows = sprints.data ?? []
    if (wantStatus) rows = rows.filter((s) => s.status === wantStatus)
    return [...rows].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.name.localeCompare(b.name))
  }, [sprints.data, view])

  const totalPages = Math.max(1, Math.ceil(filteredSprints.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedSprints = filteredSprints.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const pageInputRef = useRef<HTMLInputElement>(null)
  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    setPage(Math.min(totalPages, Math.max(1, n)))
  }

  const activeSprint = (sprints.data ?? []).find((s) => s.status === 'active') ?? null
  const activeTasks = activeSprint ? (tasksBySprintId.get(activeSprint.id) ?? []) : []
  const stats = [
    { label: 'SPRINT', value: String((sprints.data ?? []).length), note: 'DI PROJECT INI' },
    { label: 'SPRINT AKTIF', value: activeSprint ? '1' : '0', note: activeSprint ? activeSprint.name.toUpperCase() : 'TIDAK ADA YANG BERJALAN' },
    { label: 'TASK SPRINT AKTIF', value: String(activeTasks.length), note: `${activeTasks.filter((t) => t.status_name === 'DONE').length} SELESAI` },
    { label: 'BLOCKED', value: String(activeTasks.filter((t) => t.status_name === 'BLOCKED').length), note: 'PERLU TINDAKAN' },
  ]

  return (
    <div className="space-y-3.5 p-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-line bg-raised-2 p-3.5">
            <div className="font-mono text-[9px] tracking-[0.12em] text-text-dim">{s.label}</div>
            <div className="mt-1.5 text-[20px] font-extrabold text-text-bone">{s.value}</div>
            <div className="mt-1.5 font-mono text-[8.5px] text-text-dim">{s.note}</div>
          </div>
        ))}
      </div>

      {(sprints.isLoading || tasks.isLoading) && <p className="text-sm text-text-muted">Memuat...</p>}
      {(sprints.isError || tasks.isError) && <p className="text-sm text-destructive">Gagal memuat daftar sprint.</p>}

      <div className="flex flex-col gap-3">
        {pagedSprints.map((s) => (
          <SprintCard key={s.id} sprint={s} tasksInSprint={tasksBySprintId.get(s.id) ?? []} />
        ))}
        {!sprints.isLoading && filteredSprints.length === 0 && (
          <div className="border border-line p-8 text-center font-mono text-[10.5px] text-text-dim">
            Tidak ada sprint pada tampilan ini.
            <br />
            Gunakan + Sprint untuk membuat fase kerja baru.
          </div>
        )}
      </div>

      {filteredSprints.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border border-line px-4 py-2.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted disabled:opacity-40"
          >
            ← Sblm
          </button>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-dim">
            Halaman
            <input
              key={currentPage}
              ref={pageInputRef}
              type="number"
              min={1}
              max={totalPages}
              defaultValue={currentPage}
              onKeyDown={(e) => e.key === 'Enter' && goToPage(e.currentTarget.value)}
              className="w-11 border border-line-strong bg-input-bg px-1 py-0.5 text-center font-mono text-[10px] text-text-body focus-visible:border-signal focus-visible:outline-none"
              aria-label="Nomor halaman"
            />
            / {totalPages} · {filteredSprints.length} data
            <button
              type="button"
              onClick={() => goToPage(pageInputRef.current?.value ?? '')}
              className="border border-line-strong px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.04em] text-text-muted"
            >
              Ke
            </button>
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted disabled:opacity-40"
          >
            Brkt →
          </button>
        </div>
      )}

      <div className="border border-line-subtle px-4 py-2.5 font-mono text-[8.5px] leading-relaxed text-text-dim">
        Hanya satu sprint AKTIF per project. Menutup sprint memindahkan task yang belum DONE kembali ke backlog; seluruh perubahan tercatat di Audit Trail.
      </div>

      <AddSprintModal projectId={pid} open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

export default function SprintPage() {
  return (
    <ErrorBoundary>
      <SprintPageContent />
    </ErrorBoundary>
  )
}
