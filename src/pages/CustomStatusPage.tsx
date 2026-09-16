import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import AddStatusModal from '@/components/status/AddStatusModal'
import ManageStatusPanel from '@/components/status/ManageStatusPanel'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useMoveStatus, useWorkspaceStatuses } from '@/features/tasks/hooks'
import { statusColorClasses, type CustomStatus } from '@/features/tasks/types'
import { useProjects } from '@/features/projects/hooks'
import { cn } from '@/lib/utils'

// UNTRACKED -- sama konstanta dengan ManageStatusPanel/backend
// customStatusUntracked.
const UNTRACKED = ['BACKLOG', 'DONE', 'BLOCKED']
type Filter = 'Semua' | 'Sistem' | 'Kustom' | 'Per Project'

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 border border-line bg-panel px-4 py-3.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">{label}</div>
      <div className="mt-1.5 text-2xl font-bold text-text-bone">{value}</div>
    </div>
  )
}

// CustomStatusPage (S4W-05/06, US-020/021, "AW Custom Status.dc.html") --
// Kelola template status workspace: tambah/ubah nama+warna/urutan/undefine/
// pulihkan. HANYA Admin Workspace (+GA/PA bypass) yang bisa mengubah --
// nav-nya sendiri sudah digerbangi adminOnly di WorkspaceLayout.
function CustomStatusPageContent() {
  const { wsId } = useParams<{ wsId: string }>()
  const workspaceId = wsId ?? ''
  const { view, registerCta } = useOutletContext<WorkspaceOutletContext>()
  const filter = view as Filter
  const { data, isLoading, isError } = useWorkspaceStatuses(workspaceId)
  const projects = useProjects(workspaceId)
  const moveStatus = useMoveStatus(workspaceId)
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
  // orderIndex -- posisi status DI DAFTAR PENUH (bukan di tab yang sedang
  // difilter) -- ▲▼ menukar posisi dengan tetangga di daftar penuh persis
  // seperti backend Move, jadi nomor URUT dan batas atas/bawah tombol
  // harus mengikuti daftar penuh juga, sama seperti "AW Custom
  // Status.dc.html" (index `i` dari `this.state.statuses`, bukan dari
  // hasil filter tab).
  const orderIndex = useMemo(() => new Map(all.map((s, i) => [s.id, i])), [all])

  const rows = useMemo(() => {
    if (filter === 'Kustom') return all.filter((s) => !s.is_system)
    if (filter === 'Sistem') return all.filter((s) => s.is_system && !s.is_undefined)
    return all
  }, [all, filter])

  const isUsage = filter === 'Per Project'
  const projectList = projects.data ?? []

  return (
    <div className="space-y-3.5 p-6">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Status" value={String(active.length)} />
        <MetricCard label="Sistem" value={String(active.filter((s) => s.is_system).length)} />
        <MetricCard label="Kustom Workspace" value={String(active.filter((s) => !s.is_system).length)} />
        <MetricCard label="Konfirmasi Mulai" value={String(active.filter((s) => s.require_start_confirmation).length)} />
      </div>

      {isUsage ? (
        <div className="border border-line">
          <div className="border-b border-line bg-panel px-4 py-3.5">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Status yang Dipakai per Project</div>
            <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-text-dim">
              Project Manager menyesuaikan status di level project, jadi susunannya bisa berbeda dari template
              workspace. Daftar ini hanya untuk peninjauan -- perubahan dilakukan Project Manager di project
              masing-masing.
            </p>
          </div>
          <div className="divide-y divide-line">
            {projects.isLoading && <div className="px-4 py-6 font-mono text-[10.5px] text-text-muted">Memuat...</div>}
            {!projects.isLoading && projectList.length === 0 && (
              <div className="px-4 py-6 text-center font-mono text-[10.5px] text-text-muted">Belum ada project di workspace ini.</div>
            )}
            {projectList.map((p) => (
              <div key={p.id} className="flex flex-col gap-2.5 px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[13.5px] font-semibold text-text-bone">{p.name}</span>
                  <span className="font-mono text-[9px] text-text-muted">
                    {p.code} · {p.task_count} task · PM {p.pm_name || '—'}
                  </span>
                  <span
                    className={cn(
                      'border px-1.5 py-0.5 font-mono text-[9px] font-semibold',
                      p.is_archived ? 'border-amber text-amber' : 'border-mint text-mint',
                    )}
                  >
                    {p.is_archived ? 'ARSIP' : 'AKTIF'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {active.map((s) => {
                    const cls = statusColorClasses(s.color_token)
                    return (
                      <span key={s.id} className={cn('border px-1.5 py-1 font-mono text-[9px] font-semibold tracking-[0.05em]', cls.border, cls.text)}>
                        {s.name}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-line">
          <div className="grid grid-cols-[60px_2.2fr_0.8fr_1.1fr_0.7fr] gap-2 border-b border-line bg-panel px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
            <span>Urut</span>
            <span>Status</span>
            <span>Jenis</span>
            <span>Konfirmasi Mulai</span>
            <span>Aksi</span>
          </div>
          {isLoading && <div className="px-4 py-6 font-mono text-[10.5px] text-text-muted">Memuat...</div>}
          {isError && <div className="px-4 py-6 font-mono text-[10.5px] text-destructive">Gagal memuat daftar status.</div>}
          {!isLoading && !isError && rows.length === 0 && (
            <div className="px-4 py-6 text-center font-mono text-[10.5px] text-text-muted">Tidak ada status berjenis ini.</div>
          )}
          {rows.map((s) => {
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
            Template ini menjadi daftar status bawaan setiap PROJECT BARU di workspace -- project yang sudah berjalan
            tetap memakai daftar statusnya sendiri dan diatur Project Manager masing-masing.
          </div>
        </div>
      )}

      <AddStatusModal workspaceId={workspaceId} open={addOpen} onClose={() => setAddOpen(false)} />
      <ManageStatusPanel workspaceId={workspaceId} status={managingStatus} onClose={() => setManagingId(null)} />
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
    <div className="grid grid-cols-[60px_2.2fr_0.8fr_1.1fr_0.7fr] items-center gap-2 border-t border-line px-4 py-3">
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
            {status.is_undefined
              ? 'UNDEFINED · tidak disalin ke project baru'
              : status.is_system
                ? 'status sistem · selalu ada di setiap project'
                : 'kustom workspace · diwarisi project baru'}
          </div>
        </div>
      </div>
      <span className={cn('w-fit border px-1.5 py-0.5 font-mono text-[9px] font-semibold', kindColor)}>{kind}</span>
      <span className={cn('font-mono text-[9px] tracking-[0.06em]', !trackable ? 'text-text-faint' : status.require_start_confirmation ? 'text-mint' : 'text-text-muted')}>
        {!trackable ? '— Tidak Berlaku' : status.require_start_confirmation ? '● ON' : '○ OFF'}
      </span>
      <button type="button" onClick={onManage} className="w-fit font-mono text-[10px] text-text-muted hover:text-signal">
        ✎ Kelola
      </button>
    </div>
  )
}

export default function CustomStatusPage() {
  return (
    <ErrorBoundary>
      <CustomStatusPageContent />
    </ErrorBoundary>
  )
}
