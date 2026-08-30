import { useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import AddProjectModal from '@/components/projects/AddProjectModal'
import ManageProjectModal from '@/components/projects/ManageProjectModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { useProjects } from '@/features/projects/hooks'
import { cn } from '@/lib/utils'

const PROJECT_PAGE_SIZE = 10
const FILTERS = ['Semua', 'Aktif', 'Arsip'] as const
type Filter = (typeof FILTERS)[number]

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 border border-line bg-panel px-4 py-3.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">{label}</div>
      <div className="mt-1.5 text-2xl font-bold text-text-bone">{value}</div>
    </div>
  )
}

// S4-04, US-012 (AW Projects.dc.html) -- halaman "Semua Project" di dalam
// satu workspace. "SPRINT · TASK" kolom dari desain SENGAJA tidak dibuat --
// tabel sprints/tasks belum ada (menyusul S4-06+), menampilkan angka palsu
// lebih menyesatkan daripada menghilangkan kolomnya.
function ProjectListPageContent() {
  const { wsId } = useParams<{ wsId: string }>()
  const workspaceId = wsId ?? ''
  const { data, isLoading, isError } = useProjects(workspaceId)
  const [filter, setFilter] = useState<Filter>('Semua')
  const [addOpen, setAddOpen] = useState(false)
  const [managingId, setManagingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const all = data ?? []
  // Cari objek terbaru dari `all` (bukan snapshot saat "Kelola" diklik) --
  // supaya panel langsung mencerminkan state setelah arsip/simpan berhasil
  // (React Query invalidate+refetch, bukan WebSocket, jadi wajib re-lookup).
  const managingProject = all.find((p) => p.id === managingId) ?? null
  const filtered = useMemo(() => {
    if (filter === 'Semua') return all
    return all.filter((p) => (filter === 'Aktif' ? !p.is_archived : p.is_archived))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `data` (bukan `all`) sumber identitas yang stabil
  }, [data, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PROJECT_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PROJECT_PAGE_SIZE, currentPage * PROJECT_PAGE_SIZE)

  const pageInputRef = useRef<HTMLInputElement>(null)
  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    setPage(Math.min(totalPages, Math.max(1, n)))
  }

  return (
    <div className="space-y-3.5 p-6">
      {all.length > 0 && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <MetricCard label="Total Project" value={String(all.length)} />
          <MetricCard label="Aktif" value={String(all.filter((p) => !p.is_archived).length)} />
          <MetricCard label="Arsip" value={String(all.filter((p) => p.is_archived).length)} />
        </div>
      )}

      <div className="flex items-center gap-3.5">
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f)
                setPage(1)
              }}
              className={cn(
                'border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em]',
                filter === f ? 'border-signal text-signal' : 'border-line text-text-muted',
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button onClick={() => setAddOpen(true)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
          + Project
        </Button>
      </div>

      {isLoading && <p className="font-mono text-sm text-text-muted">Memuat...</p>}
      {isError && <p className="font-mono text-sm text-destructive">Gagal memuat daftar project.</p>}
      {!isLoading && !isError && filtered.length === 0 && (
        <p className="border border-dashed border-line-strong px-4 py-6 text-center font-mono text-[10.5px] leading-relaxed text-text-muted">
          Belum ada project pada tampilan ini.
          <br />
          Gunakan tombol + Project untuk membuat wadah sprint dan task pertama.
        </p>
      )}

      {filtered.length > 0 && (
        <div className="overflow-x-auto border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-panel text-left">
                {['Project', 'Project Manager', 'Members', 'Status', 'Aksi'].map((h) => (
                  <th key={h} className="py-2.5 pl-3.5 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="py-3 pl-3.5 pr-4">
                    <div className="flex items-center gap-2.5">
                      <span className="border border-signal/40 px-1.5 py-1 font-mono text-[9px] font-bold text-signal">
                        {p.code}
                      </span>
                      <span className="text-[13px] text-text-bone">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="text-[12px] text-text-body">{p.pm_name || '—'}</div>
                    <div className="font-mono text-[8.5px] text-text-muted">{p.pm_email}</div>
                  </td>
                  <td className="py-3 pr-4 font-mono text-[10px] text-text-muted">{p.member_count}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        'border px-1.5 py-0.5 font-mono text-[9px] font-semibold',
                        p.is_archived ? 'border-amber text-amber' : 'border-mint text-mint',
                      )}
                    >
                      {p.is_archived ? 'ARSIP' : 'AKTIF'}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => setManagingId(p.id)}
                      className="font-mono text-[10px] text-text-muted hover:text-signal"
                    >
                      ✎ Kelola
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > PROJECT_PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted disabled:opacity-40"
              >
                ← Sebelumnya
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') goToPage(e.currentTarget.value)
                  }}
                  className="w-11 border border-line-strong bg-bg-deep px-1 py-0.5 text-center font-mono text-[10px] text-text-body focus-visible:border-signal focus-visible:outline-none"
                  aria-label="Nomor halaman"
                />
                / {totalPages} · {filtered.length} data
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
                Berikutnya →
              </button>
            </div>
          )}
        </div>
      )}

      <AddProjectModal workspaceId={workspaceId} open={addOpen} onClose={() => setAddOpen(false)} />
      <ManageProjectModal workspaceId={workspaceId} project={managingProject} onClose={() => setManagingId(null)} />
    </div>
  )
}

export default function ProjectListPage() {
  return (
    <ErrorBoundary>
      <ProjectListPageContent />
    </ErrorBoundary>
  )
}
