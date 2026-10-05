import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import AddProjectStatusModal from '@/components/status/AddProjectStatusModal'
import ManageProjectStatusPanel from '@/components/status/ManageProjectStatusPanel'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useMoveProjectStatus, useProjectStatuses } from '@/features/tasks/hooks'
import { statusColorClasses, type CustomStatus } from '@/features/tasks/types'
import { useProjects } from '@/features/projects/hooks'
import { cn } from '@/lib/utils'

// UNTRACKED -- sama konstanta dengan ManageProjectStatusPanel/backend
// customStatusUntracked.
const UNTRACKED = ['BACKLOG', 'DONE', 'BLOCKED', 'CANCELED']

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 border border-line bg-panel px-4 py-3.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">{label}</div>
      <div className="mt-1.5 text-2xl font-bold text-text-bone">{value}</div>
    </div>
  )
}

// ProjectStatusSettingsPage (Track S5B, US-019, "PM Custom Status.dc.html")
// -- versi project dari CustomStatusPage.tsx (AW): status di sini adalah
// salinan independen project ini, disalin dari template workspace saat
// project dibuat (ProjectService.Create/CloneForProject), lalu berdiri
// sendiri. PM-of-project + Admin Workspace boleh mengubah (ditegakkan
// backend, authorizeScope).
function ProjectStatusSettingsPageContent() {
  const { wsId, projectId } = useParams<{ wsId: string; projectId: string }>()
  const workspaceId = wsId ?? ''
  const pid = projectId ?? ''
  const { registerCta } = useOutletContext<WorkspaceOutletContext>()

  const projects = useProjects(workspaceId)
  const project = projects.data?.find((p) => p.id === pid) ?? null

  const { data, isLoading, isError } = useProjectStatuses(pid)
  const moveStatus = useMoveProjectStatus(pid)
  const [addOpen, setAddOpen] = useState(false)
  const [managingId, setManagingId] = useState<string | null>(null)

  useEffect(() => {
    registerCta(() => setAddOpen(true))
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const all = useMemo(() => data ?? [], [data])
  const managingStatus = all.find((s) => s.id === managingId) ?? null
  const active = all.filter((s) => !s.is_undefined)
  // orderIndex -- posisi status DI DAFTAR PENUH, sama pola CustomStatusPage
  // (AW): ▲▼ menukar posisi dengan tetangga di daftar penuh persis seperti
  // backend Move, jadi nomor URUT dan batas atas/bawah tombol mengikuti
  // daftar penuh.
  const orderIndex = useMemo(() => new Map(all.map((s, i) => [s.id, i])), [all])

  return (
    <div className="space-y-3.5 p-6">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
          {project?.code} · {project?.name ?? '...'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Status" value={String(active.length)} />
        <MetricCard label="Sistem" value={String(active.filter((s) => s.is_system).length)} />
        <MetricCard label="Kustom Project" value={String(active.filter((s) => !s.is_system).length)} />
        <MetricCard label="Konfirmasi Mulai" value={String(active.filter((s) => s.require_start_confirmation).length)} />
      </div>

      <div className="border border-line">
        <div className="grid grid-cols-[60px_2fr_0.8fr_0.7fr_1.1fr_0.7fr] gap-2 border-b border-line bg-panel px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
          <span>Urut</span>
          <span>Status</span>
          <span>Jenis</span>
          <span>Task</span>
          <span>Konfirmasi Mulai</span>
          <span>Aksi</span>
        </div>
        {isLoading && <div className="px-4 py-6 font-mono text-[10.5px] text-text-muted">Memuat...</div>}
        {isError && <div className="px-4 py-6 font-mono text-[10.5px] text-destructive">Gagal memuat daftar status.</div>}
        {!isLoading && !isError && all.length === 0 && (
          <div className="px-4 py-6 text-center font-mono text-[10.5px] text-text-muted">Belum ada status di project ini.</div>
        )}
        {all.map((s) => {
          const idx = orderIndex.get(s.id) ?? 0
          return (
            <StatusRow
              key={s.id}
              status={s}
              order={idx + 1}
              isFirst={idx === 0}
              isLast={idx === all.length - 1}
              moving={moveStatus.isPending}
              onMove={(direction) => moveStatus.mutate({ statusId: s.id, direction })}
              onManage={() => setManagingId(s.id)}
            />
          )
        })}
        <div className="border-t border-line bg-raised-2 px-4 py-2.5 font-mono text-[9px] leading-relaxed text-text-muted">
          Daftar ini menyalin template workspace saat project dibuat, lalu berdiri sendiri -- perubahan di sini tidak
          mempengaruhi project lain.
        </div>
      </div>

      <AddProjectStatusModal projectId={pid} projectName={project?.name ?? ''} open={addOpen} onClose={() => setAddOpen(false)} />
      <ManageProjectStatusPanel projectId={pid} status={managingStatus} onClose={() => setManagingId(null)} />
    </div>
  )
}

interface StatusRowProps {
  status: CustomStatus
  order: number
  isFirst: boolean
  isLast: boolean
  moving: boolean
  onMove: (direction: 'up' | 'down') => void
  onManage: () => void
}

function StatusRow({ status, order, isFirst, isLast, moving, onMove, onManage }: StatusRowProps) {
  const cls = statusColorClasses(status.color_token)
  const trackable = !status.is_system || !UNTRACKED.includes(status.name)
  const kind = status.is_undefined ? 'UNDEF' : status.is_system ? 'SISTEM' : 'KUSTOM'
  const kindColor = status.is_undefined ? 'border-destructive text-destructive' : status.is_system ? 'border-blue text-blue' : 'border-amber text-amber'
  return (
    <div className="grid grid-cols-[60px_2fr_0.8fr_0.7fr_1.1fr_0.7fr] items-center gap-2 border-t border-line px-4 py-3">
      <div className="flex items-center gap-1.5 font-mono text-[10px] text-text-muted">
        <span>{order}</span>
        <div className="flex flex-col gap-0.5 leading-none">
          <button
            type="button"
            disabled={isFirst || moving}
            onClick={() => onMove('up')}
            className="text-text-muted hover:text-signal disabled:cursor-not-allowed disabled:text-line-strong disabled:hover:text-line-strong"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={isLast || moving}
            onClick={() => onMove('down')}
            className="text-text-muted hover:text-signal disabled:cursor-not-allowed disabled:text-line-strong disabled:hover:text-line-strong"
          >
            ▼
          </button>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn('block h-[26px] w-[26px] flex-shrink-0', status.is_undefined ? 'bg-line-strong' : cls.dot)} />
        <div className="min-w-0 leading-tight">
          <div className={cn('truncate text-[13px]', status.is_undefined ? 'text-text-dim' : 'text-text-bone')}>{status.name}</div>
          <div className="truncate font-mono text-[9px] text-text-muted">
            {status.is_undefined ? 'UNDEFINED · task lama tidak berubah' : status.is_system ? 'status sistem' : 'kustom project ini'}
          </div>
        </div>
      </div>
      <span className={cn('w-fit border px-1.5 py-0.5 font-mono text-[9px] font-semibold', kindColor)}>{kind}</span>
      <span className="font-mono text-[10px] text-text-muted">{status.task_count}</span>
      <span className={cn('font-mono text-[9px] tracking-[0.06em]', !trackable ? 'text-text-faint' : status.require_start_confirmation ? 'text-mint' : 'text-text-muted')}>
        {!trackable ? '— Tidak Berlaku' : status.require_start_confirmation ? '● ON' : '○ OFF'}
      </span>
      <button type="button" onClick={onManage} className="w-fit font-mono text-[10px] text-text-muted hover:text-signal">
        ✎ Kelola
      </button>
    </div>
  )
}

export default function ProjectStatusSettingsPage() {
  return (
    <ErrorBoundary>
      <ProjectStatusSettingsPageContent />
    </ErrorBoundary>
  )
}
