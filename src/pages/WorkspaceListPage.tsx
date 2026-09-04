import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'

import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import CreateWorkspaceModal from '@/components/workspaces/CreateWorkspaceModal'
import ManageWorkspaceModal from '@/components/workspaces/ManageWorkspaceModal'
import { useWorkspaceListByGroup } from '@/features/workspaces/hooks'
import type { WorkspaceListRow } from '@/features/workspaces/types'
import { cn, logoBgClass } from '@/lib/utils'

const GB = 1024 * 1024 * 1024
const WS_PAGE_SIZE = 10

type Status = 'AKTIF' | 'ARSIP' | 'NONAKTIF'

// statusOf -- desain "GA Workspaces.dc.html" menampilkan SATU badge status
// per baris, tapi backend punya 2 kolom independen (archived_at BISA
// bersamaan dengan deactivated_at, lihat komentar WorkspaceRepository.Archive).
// ARSIP diprioritaskan tampil kalau keduanya aktif -- toggle Nonaktifkan di
// panel Kelola tetap terlihat state aslinya masing-masing, ini cuma badge
// ringkasan grid.
function statusOf(w: Pick<WorkspaceListRow, 'archived_at' | 'deactivated_at'>): Status {
  if (w.archived_at !== null) return 'ARSIP'
  if (w.deactivated_at !== null) return 'NONAKTIF'
  return 'AKTIF'
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'mint' | 'amber' | 'destructive' | 'signal' }) {
  return (
    <div className="flex-1 min-w-[130px] border border-line bg-panel p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">{label}</div>
      <div
        className={cn(
          'mt-1.5 text-2xl font-bold',
          tone === 'mint' && 'text-mint',
          tone === 'amber' && 'text-amber',
          tone === 'destructive' && 'text-destructive',
          tone === 'signal' && 'text-signal',
        )}
      >
        {value}
      </div>
    </div>
  )
}

// S4G-05, Track S4G (desain "GA Workspaces.dc.html") -- diperkaya penuh dari
// versi minimal S3-13: grid GROUP-WIDE lintas organisasi (org jadi kolom,
// bukan parameter route), stats bar, storage bar per-workspace (SELALU 0%
// untuk sekarang -- lihat komentar WorkspaceListRow di types.ts), search,
// filter tab (dari GroupAdminLayout, sama pola OrganizationManagementPage),
// pagination 10/hal. `?org_id=` (opsional) -- deep-link dari link "WS ·
// Member" di OrganizationManagementPage, filter awal ke SATU organisasi,
// bisa dihapus lewat tombol "Tampilkan Semua".
function WorkspaceListPageContent() {
  const [searchParams, setSearchParams] = useSearchParams()
  const orgIdFilter = searchParams.get('org_id')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const outletContext = useOutletContext<GroupAdminOutletContext>()
  const isBareRender = !outletContext
  const { view, registerCta, groupId } = outletContext ?? { view: 'Semua', registerCta: () => {}, groupId: undefined }
  const list = useWorkspaceListByGroup(isBareRender ? undefined : groupId)

  useEffect(() => {
    registerCta(() => setCreateOpen(true))
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(() => list.data ?? [], [list.data])
  const selected = rows.find((w) => w.id === selectedId) ?? null

  // Stats selalu dari SELURUH workspace terlihat (bukan hasil filter view/
  // search/org), sama pola OrganizationManagementPage.
  const stats = useMemo(() => {
    let aktif = 0,
      arsip = 0,
      nonaktif = 0,
      usedTotal = 0
    for (const w of rows) {
      const s = statusOf(w)
      if (s === 'AKTIF') aktif++
      else if (s === 'ARSIP') arsip++
      else nonaktif++
      usedTotal += w.storage_used_bytes
    }
    return { total: rows.length, aktif, arsip, nonaktif, usedTotal }
  }, [rows])

  const filteredRows = useMemo(() => {
    let r = rows
    if (orgIdFilter) r = r.filter((w) => w.org_id === orgIdFilter)
    if (view !== 'Semua') {
      const want = view === 'Aktif' ? 'AKTIF' : view === 'Arsip' ? 'ARSIP' : 'NONAKTIF'
      r = r.filter((w) => statusOf(w) === want)
    }
    const q = query.trim().toLowerCase()
    if (q) {
      r = r.filter((w) =>
        [w.name, w.org_name, w.admin_name ?? '', w.admin_email ?? ''].some((f) => f.toLowerCase().includes(q)),
      )
    }
    return r
  }, [rows, orgIdFilter, view, query])
  useEffect(() => setPage(1), [view, query, orgIdFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / WS_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = filteredRows.slice((currentPage - 1) * WS_PAGE_SIZE, currentPage * WS_PAGE_SIZE)
  const pageInputRef = useRef<HTMLInputElement>(null)
  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    setPage(Math.min(totalPages, Math.max(1, n)))
  }

  const orgIdFilterName = orgIdFilter ? rows.find((w) => w.org_id === orgIdFilter)?.org_name : undefined

  return (
    <>
      <div className="space-y-3.5 p-6">
        {isBareRender && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="bg-signal px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-bg-deep"
            >
              + Workspace
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <StatCard label="Total Workspace" value={String(stats.total)} />
          <StatCard label="Aktif" value={String(stats.aktif)} tone="mint" />
          <StatCard label="Arsip" value={String(stats.arsip)} tone="amber" />
          <StatCard label="Nonaktif" value={String(stats.nonaktif)} tone="destructive" />
          <StatCard label="Storage Workspace" value={`${(stats.usedTotal / GB).toFixed(1)} GB`} tone="signal" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama workspace, organisasi, atau admin..."
            className="max-w-[320px] flex-1 border border-line-strong bg-input-bg px-3 py-1.5 font-mono text-[11px] text-text-body outline-none placeholder:text-text-dim focus-visible:border-signal"
          />
          {orgIdFilter && (
            <span className="flex items-center gap-2 font-mono text-[10px] text-text-muted">
              Difilter ke organisasi <strong className="text-text-body">{orgIdFilterName ?? orgIdFilter}</strong>
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  next.delete('org_id')
                  setSearchParams(next)
                }}
                className="border border-line-strong px-1.5 py-0.5 uppercase tracking-[0.04em] text-text-muted hover:text-signal"
              >
                Tampilkan Semua
              </button>
            </span>
          )}
        </div>

        <div className="border border-line">
          <div className="border-b border-line bg-raised-2 px-4 py-2.5">
            <div className="grid grid-cols-[1.6fr_1.1fr_1.3fr_0.9fr_0.65fr_0.65fr] gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
              <span>Workspace</span>
              <span>Organisasi</span>
              <span>Admin Workspace</span>
              <span>Storage</span>
              <span>Status</span>
              <span>Aksi</span>
            </div>
          </div>
          {list.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
          {list.isError && <p className="p-4 text-sm text-destructive">Gagal memuat daftar workspace.</p>}
          {filteredRows.length === 0 && !list.isLoading && (
            <p className="p-4 text-sm text-text-muted">
              {rows.length === 0 ? 'Belum ada workspace. Gunakan tombol + Workspace untuk membuat wadah project pertama.' : 'Tidak ada workspace yang cocok.'}
            </p>
          )}
          {pagedRows.map((w) => (
            <WorkspaceRow key={w.id} workspace={w} onManage={() => setSelectedId(w.id)} />
          ))}
          {filteredRows.length > WS_PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') goToPage(e.currentTarget.value)
                  }}
                  className="w-11 border border-line-strong bg-input-bg px-1 py-0.5 text-center font-mono text-[10px] text-text-body focus-visible:border-signal focus-visible:outline-none"
                  aria-label="Nomor halaman"
                />
                / {totalPages}
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
        </div>
      </div>

      <CreateWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ManageWorkspaceModal workspace={selected} onClose={() => setSelectedId(null)} />
    </>
  )
}

function WorkspaceRow({ workspace, onManage }: { workspace: WorkspaceListRow; onManage: () => void }) {
  const status = statusOf(workspace)
  const pct = workspace.org_storage_quota_bytes > 0 ? (workspace.storage_used_bytes / workspace.org_storage_quota_bytes) * 100 : 0
  const barTone = pct >= 80 ? 'bg-destructive' : pct >= 60 ? 'bg-amber' : 'bg-mint'
  const statusTone =
    status === 'AKTIF' ? 'border-mint text-mint' : status === 'ARSIP' ? 'border-amber text-amber' : 'border-destructive text-destructive'

  return (
    <div className="grid grid-cols-[1.6fr_1.1fr_1.3fr_0.9fr_0.65fr_0.65fr] items-center gap-3 border-t border-line px-4 py-3">
      <div>
        <div className="text-[13px] text-text-body">{workspace.name}</div>
        <div className="font-mono text-[10px] text-text-muted">
          Dibuat {new Date(workspace.created_at).toLocaleDateString('id-ID')}
        </div>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={cn(
            'flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center text-[10px] font-extrabold text-bg-deep',
            logoBgClass(workspace.org_id),
          )}
        >
          {workspace.org_name.charAt(0).toUpperCase()}
        </span>
        <span className="truncate font-mono text-[11px] text-text-muted">{workspace.org_name}</span>
      </div>
      <div className="min-w-0">
        {workspace.admin_name ? (
          <>
            <div className="truncate text-[12px] text-text-body">{workspace.admin_name}</div>
            <div className="truncate font-mono text-[10px] text-text-muted">{workspace.admin_email}</div>
          </>
        ) : (
          <span className="font-mono text-[10px] text-amber">
            {workspace.pending_admin_email ? `Undangan pending · ${workspace.pending_admin_email}` : '— belum ada admin'}
          </span>
        )}
      </div>
      <div>
        <div className="flex items-baseline justify-between font-mono text-[10px] text-text-muted">
          <span>{(workspace.storage_used_bytes / GB).toFixed(1)} GB</span>
          <span>{Math.round(pct)}% org</span>
        </div>
        <div className="mt-1 h-[5px] w-full bg-line-subtle">
          <div className={cn('h-full', barTone)} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      </div>
      <span className={cn('w-fit border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]', statusTone)}>{status}</span>
      <button onClick={onManage} className="w-fit font-mono text-[10px] text-text-muted hover:text-signal">
        ✎ Kelola
      </button>
    </div>
  )
}

export default function WorkspaceListPage() {
  return (
    <ErrorBoundary>
      <WorkspaceListPageContent />
    </ErrorBoundary>
  )
}
