import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import EditPicGroupModal from '@/components/pic-group/EditPicGroupModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { usePicGroups, useReplacePicGroup } from '@/features/pic-groups/hooks'
import { buildRows, filterRows, pageWindow, type PicGroupModeFilter } from '@/features/pic-groups/rows'
import { useProjectMembers } from '@/features/project-members/hooks'
import { useProjects } from '@/features/projects/hooks'
import { useProjectStatuses } from '@/features/tasks/hooks'
import { statusColorClasses } from '@/features/tasks/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const MODE_OPTIONS: PicGroupModeFilter[] = ['Semua', 'Terbatas', 'Full']
const PER_PAGE_OPTIONS = [10, 20, 50]
const GRID = 'grid grid-cols-[minmax(130px,1fr)_minmax(210px,2.4fr)_minmax(92px,0.7fr)_minmax(74px,0.6fr)] gap-x-2.5'
const HIDDEN_ROLES = ['admin_workspace', 'division_viewer']

const selectCls =
  'border border-line bg-input-bg px-2.5 py-2 font-mono text-[11px] text-text-body outline-none focus-visible:border-signal'

// ProjectPicGroupPage -- menu PM "PIC Group per Status" (US-017b, desain "PM
// PIC Group.dc.html"): daftar status project + siapa yang boleh jadi PIC
// (mode Terbatas untuk Editor/Approver); status tanpa anggota = Full handoff.
// Admin Workspace dan PM selalu Full handoff. Perubahan tercatat di Audit
// Trail (backend, pic_group.updated).
function ProjectPicGroupPageContent() {
  const { wsId, projectId } = useParams<{ wsId: string; projectId: string }>()
  const pid = projectId ?? ''
  const project = useProjects(wsId ?? '').data?.find((p) => p.id === pid) ?? null

  const statuses = useProjectStatuses(pid)
  const groups = usePicGroups(pid)
  const members = useProjectMembers(pid, true)
  const replace = useReplacePicGroup(pid)

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [fMode, setFMode] = useState<PicGroupModeFilter>('Semua')
  const [fMember, setFMember] = useState('Semua')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [editId, setEditId] = useState<string | null>(null)
  const [modalError, setModalError] = useState('')
  const [toast, setToast] = useState('')

  // Pesan sukses hilang sendiri setelah 15 dtk (perilaku desain).
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 15000)
    return () => clearTimeout(t)
  }, [toast])

  const roster = useMemo(() => (members.data ?? []).filter((m) => !HIDDEN_ROLES.includes(m.role) && !m.is_pending), [members.data])
  const rows = useMemo(() => buildRows(statuses.data ?? [], groups.data ?? []), [statuses.data, groups.data])
  const matched = filterRows(rows, fMode, fMember)

  const totalPages = Math.max(1, Math.ceil(matched.length / perPage))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * perPage
  const visible = matched.slice(start, start + perPage)
  const activeFilters = (fMode !== 'Semua' ? 1 : 0) + (fMember !== 'Semua' ? 1 : 0)
  const pageInfo = matched.length === 0 ? '0 STATUS' : `${start + 1}–${Math.min(start + perPage, matched.length)} DARI ${matched.length} STATUS`
  const editRow = rows.find((r) => r.statusId === editId) ?? null

  const closeModal = () => {
    setEditId(null)
    setModalError('')
  }

  const save = (userIds: string[]) => {
    if (!editRow) return
    setModalError('')
    const before = new Set(editRow.members.map((m) => m.userId))
    const unchanged = before.size === userIds.length && userIds.every((id) => before.has(id))
    replace.mutate(
      { statusId: editRow.statusId, userIds },
      {
        onSuccess: () => {
          closeModal()
          setToast(
            unchanged
              ? `Tidak ada perubahan pada PIC Group ${editRow.name}.`
              : userIds.length
                ? `PIC Group ${editRow.name} disimpan — ${userIds.length} anggota. Editor & Approver hanya dapat memilih dari grup ini. Tercatat di Audit Trail.`
                : `PIC Group ${editRow.name} dikosongkan — handoff kembali Full untuk seluruh role. Tercatat di Audit Trail.`,
          )
        },
        onError: (err) => setModalError(err instanceof ApiError ? err.message : 'Gagal menyimpan PIC Group.'),
      },
    )
  }

  if (statuses.isLoading || groups.isLoading) return <p className="p-6 text-sm text-text-muted">Memuat...</p>
  if (statuses.isError || groups.isError) return <p className="p-6 text-sm text-destructive">Gagal memuat PIC Group.</p>

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
        {project?.code} · {project?.name ?? '...'}
      </div>

      {toast && (
        <div className="relative mb-3 border border-mint p-[11px_36px_11px_13px] font-mono text-[10px] leading-[1.6] text-mint">
          {toast}
          <button type="button" onClick={() => setToast('')} className="absolute right-[11px] top-2 text-[12px]" aria-label="Tutup">
            ✕
          </button>
        </div>
      )}

      <div className="mb-3 flex-shrink-0 border border-line bg-panel">
        <button type="button" onClick={() => setFiltersOpen((v) => !v)} className="flex w-full items-center gap-2.5 px-3.5 py-[9px] text-left">
          <span className="w-2.5 font-mono text-[11px] text-text-muted">{filtersOpen ? '▾' : '▸'}</span>
          <span className="font-mono text-[9.5px] tracking-[0.14em] text-text-body">FILTER</span>
          <span
            className={cn(
              'border px-[7px] py-0.5 font-mono text-[8.5px] tracking-[0.1em]',
              activeFilters ? 'border-signal text-signal' : 'border-text-dim text-text-dim',
            )}
          >
            {activeFilters ? `${activeFilters} AKTIF` : 'TIDAK ADA'}
          </span>
          <span className="ml-auto font-mono text-[9px] text-text-dim">{pageInfo}</span>
        </button>
        {filtersOpen && (
          <div className="flex flex-col gap-3.5 border-t border-line p-3.5">
            <div className="flex flex-wrap items-end gap-3.5">
              <label className="flex min-w-[210px] flex-1 flex-col gap-1.5 font-mono text-[8.5px] tracking-[0.14em] text-text-dim">
                MODE HANDOFF
                <select
                  value={fMode}
                  onChange={(e) => {
                    setFMode(e.target.value as PicGroupModeFilter)
                    setPage(1)
                  }}
                  className={selectCls}
                >
                  {MODE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[210px] flex-1 flex-col gap-1.5 font-mono text-[8.5px] tracking-[0.14em] text-text-dim">
                ANGGOTA PIC GROUP
                <select
                  value={fMember}
                  onChange={(e) => {
                    setFMember(e.target.value)
                    setPage(1)
                  }}
                  className={selectCls}
                >
                  <option value="Semua">Semua</option>
                  {roster.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name || m.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-end gap-3.5">
              <label className="flex min-w-[110px] flex-col gap-1.5 font-mono text-[8.5px] tracking-[0.14em] text-text-dim">
                BARIS / HAL
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value))
                    setPage(1)
                  }}
                  className={selectCls}
                >
                  {PER_PAGE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  setFMode('Semua')
                  setFMember('Semua')
                  setPage(1)
                }}
                className="border border-line-strong px-3.5 py-[9px] font-mono text-[9.5px] tracking-[0.08em] text-text-muted hover:border-signal hover:text-signal"
              >
                RESET
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-line">
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-[640px]">
            <div className={cn(GRID, 'sticky top-0 z-[1] bg-raised-2 px-3.5 py-[11px] font-mono text-[9px] tracking-[0.1em] text-text-muted')}>
              <span>STATUS</span>
              <span>PIC GROUP</span>
              <span>MODE HANDOFF</span>
              <span>AKSI</span>
            </div>
            {visible.map((r) => (
              <div key={r.statusId} className={cn(GRID, 'items-center border-t border-line px-3.5 py-3')}>
                <div className="flex min-w-0 items-center gap-[9px]">
                  <span className={cn('block h-2.5 w-2.5 flex-shrink-0', r.isUndefined ? 'bg-text-faint' : statusColorClasses(r.colorToken).dot)} />
                  <span className="truncate font-mono text-[11px] font-semibold tracking-[0.04em] text-text-bone">{r.name}</span>
                </div>
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {r.members.map((m) => (
                    <span key={m.userId} className="border border-line-strong px-2 py-1 font-mono text-[9px] text-text-body">
                      {m.name}
                    </span>
                  ))}
                  {r.members.length === 0 && (
                    <span className="font-mono text-[9px] text-text-dim">Belum dikonfigurasi — semua role Full handoff</span>
                  )}
                </div>
                <span
                  className={cn(
                    'w-fit border px-2 py-[3px] font-mono text-[9px] tracking-[0.06em]',
                    r.mode === 'TERBATAS' ? 'border-signal text-signal' : 'border-text-dim text-text-dim',
                  )}
                >
                  {r.mode}
                </span>
                <button
                  type="button"
                  onClick={() => setEditId(r.statusId)}
                  className="w-fit font-mono text-[9.5px] text-signal hover:underline"
                >
                  ✎ ATUR
                </button>
              </div>
            ))}
            {matched.length === 0 && (
              <div className="p-10 text-center font-mono text-[11px] text-text-dim">Tidak ada status yang cocok dengan filter ini.</div>
            )}
          </div>
        </div>
        {matched.length > 0 && (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5 border-t border-line bg-raised-2 px-3.5 py-[9px]">
            <span className="font-mono text-[9px] tracking-[0.08em] text-text-dim">{pageInfo}</span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
                className="border border-line-strong px-[11px] py-1.5 font-mono text-[10px] text-text-muted disabled:opacity-40"
              >
                ◄ SBLM
              </button>
              {pageWindow(current, totalPages).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    'min-w-[30px] border px-[9px] py-1.5 text-center font-mono text-[10px]',
                    p === current ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={current >= totalPages}
                onClick={() => setPage(current + 1)}
                className="border border-line-strong px-[11px] py-1.5 font-mono text-[10px] text-text-muted disabled:opacity-40"
              >
                BRKT ►
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 font-mono text-[9px] leading-[1.9] text-text-dim">
        Admin Workspace &amp; Project Manager selalu Full handoff. Editor &amp; Approver hanya boleh memilih PIC dari grup status tujuan; status
        tanpa PIC Group otomatis kembali Full handoff. Setiap perubahan tercatat di Audit Trail.
      </p>

      <EditPicGroupModal
        row={editRow}
        projectName={project?.name ?? ''}
        roster={members.data ?? []}
        saving={replace.isPending}
        error={modalError}
        onSave={save}
        onClear={() => save([])}
        onClose={closeModal}
      />
    </div>
  )
}

export default function ProjectPicGroupPage() {
  return (
    <ErrorBoundary>
      <ProjectPicGroupPageContent />
    </ErrorBoundary>
  )
}
