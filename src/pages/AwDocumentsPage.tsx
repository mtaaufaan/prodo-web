import { useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { downloadAttachment } from '@/features/attachments/api'
import {
  useBulkDeleteDocuments,
  useDeleteDocument,
  useDocumentsQuota,
  useRequestQuota,
  useRestoreDocument,
  useWorkspaceDocuments,
} from '@/features/attachments/hooks'
import type { Attachment } from '@/features/attachments/types'
import { fileExt, formatBytes } from '@/features/attachments/types'
import { useProjects } from '@/features/projects/hooks'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function StatCard({ label, value, note, tone }: { label: string; value: string; note: string; tone?: 'mint' | 'destructive' | 'amber' }) {
  return (
    <div className="min-w-[110px] flex-1 border border-line bg-panel px-3.5 py-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">{label}</div>
      <div
        className={cn(
          'mt-1 text-xl font-extrabold',
          tone === 'mint' && 'text-mint',
          tone === 'destructive' && 'text-destructive',
          tone === 'amber' && 'text-amber',
        )}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[8.5px] text-text-dim">{note}</div>
    </div>
  )
}

function statusBadge(status: Attachment['status']) {
  if (status === 'deleted') return { label: 'DIHAPUS', tone: 'border-destructive text-destructive' }
  if (status === 'orphan') return { label: 'ORPHAN', tone: 'border-amber text-amber' }
  return { label: 'AKTIF', tone: 'border-mint text-mint' }
}

// AwDocumentsPage (H20-22, S4W-19/21, EPIC 10 Attachment Management, US-064b/065/066,
// desain "AW Documents.dc.html"). AW-only (RequireRole ditegakkan backend
// di setiap endpoint /workspaces/:wsId/documents*). Semua filter/urut/
// paginasi dilakukan KLIEN, pola konsisten seluruh grid lain di codebase
// ini (GroupAuditTrailPage/AwWebhookPage dkk) -- backend cuma mengirim
// SELURUH hasil workspace ini sekali fetch.
//
// Cakupan lebih sempit dari desain: role selain Admin Workspace (PM/
// Editor/Approver/Viewer, tabel RIGHTS di desain) TIDAK relevan di sini --
// endpoint ini AW-only, jadi setiap baris yang tampil SELALU bisa
// dikelola penuh (rename/hapus/restore/permanen) oleh siapa pun yang bisa
// membuka halaman ini, beda dari desain yang menyaring per role.
export default function AwDocumentsPage() {
  const { wsId } = useParams<{ wsId: string }>()
  const workspaceId = wsId ?? ''

  // status: 'all' -- backend ListForWorkspace masih menerapkan filter status
  // di server (default-nya menyembunyikan status "deleted"), tapi seluruh
  // filter/urut/paginasi UI di halaman ini dilakukan klien (pola "Grid 1"
  // dan supaya dropdown pengunggah berasal dari daftar PENUH, bukan
  // subset). Minta 'all' sekali di sini supaya data mentahnya benar-benar
  // lengkap sebelum difilter ulang di JS.
  const documents = useWorkspaceDocuments(workspaceId, { status: 'all' })
  const quota = useDocumentsQuota(workspaceId)
  const projects = useProjects(workspaceId)
  const deleteDoc = useDeleteDocument(workspaceId)
  const bulkDelete = useBulkDeleteDocuments(workspaceId)
  const restoreDoc = useRestoreDocument()
  const requestQuota = useRequestQuota(workspaceId)

  const [quotaOpen, setQuotaOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [fProject, setFProject] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fExt, setFExt] = useState('')
  const [fUploader, setFUploader] = useState('')
  const [fSort, setFSort] = useState('')
  const [page, setPage] = useState(1)
  const pageInputRef = useRef<HTMLInputElement>(null)

  const [selected, setSelected] = useState<string[]>([])
  const [renameTarget, setRenameTarget] = useState<Attachment | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [deleteTargets, setDeleteTargets] = useState<Attachment[] | null>(null)
  const [deleteMode, setDeleteMode] = useState<'retensi' | 'permanen'>('retensi')
  const [confirmWsName, setConfirmWsName] = useState('')
  const [quotaReqOpen, setQuotaReqOpen] = useState(false)
  const [reqGb, setReqGb] = useState('5')
  const [reqReason, setReqReason] = useState('')
  const [notice, setNotice] = useState('')
  const [modalError, setModalError] = useState('')

  const all = useMemo(() => documents.data ?? [], [documents.data])
  const activeProjects = (projects.data ?? []).filter((p) => !p.is_archived)
  const uploaders = useMemo(() => {
    const seen = new Map<string, string>()
    all.forEach((d) => seen.set(d.uploader_id, d.uploader_name || d.uploader_email))
    return Array.from(seen.entries())
  }, [all])
  const exts = useMemo(() => Array.from(new Set(all.map((d) => fileExt(d.original_name)))).sort(), [all])

  const filtered = useMemo(() => {
    let list = all
    if (fProject) list = list.filter((d) => d.project_id === fProject)
    if (fUploader) list = list.filter((d) => d.uploader_id === fUploader)
    if (fExt) list = list.filter((d) => fileExt(d.original_name) === fExt)
    if (fStatus === 'active') list = list.filter((d) => d.status === 'active')
    else if (fStatus === 'orphan') list = list.filter((d) => d.status === 'orphan')
    else if (fStatus === 'deleted') list = list.filter((d) => d.status === 'deleted')
    else if (fStatus !== 'all') list = list.filter((d) => d.status !== 'deleted') // default: aktif & orphan

    const sorted = [...list]
    if (fSort === 'smallest') sorted.sort((a, b) => a.size_bytes - b.size_bytes)
    else if (fSort === 'newest') sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (fSort === 'oldest') sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    else if (fSort === 'name') sorted.sort((a, b) => a.display_name.localeCompare(b.display_name))
    else sorted.sort((a, b) => b.size_bytes - a.size_bytes) // default: terbesar
    return sorted
  }, [all, fProject, fUploader, fExt, fStatus, fSort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    setPage(Math.min(totalPages, Math.max(1, n)))
  }

  const stats = useMemo(() => {
    const active = all.filter((d) => d.status !== 'deleted')
    const orphan = all.filter((d) => d.status === 'orphan')
    const activeBytes = active.reduce((a, d) => a + d.size_bytes, 0)
    return { total: active.length, sizeLabel: formatBytes(activeBytes), orphanCount: orphan.length }
  }, [all])

  const quotaPct = quota.data && quota.data.quota_bytes > 0 ? Math.min(100, (quota.data.used_bytes / quota.data.quota_bytes) * 100) : 0
  const quotaCritical = quotaPct >= 95
  const quotaWarn = quotaPct >= 80

  const toggleSelect = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const toggleSelectAllOnPage = () => {
    const ids = paged.map((d) => d.id)
    const allPicked = ids.every((id) => selected.includes(id))
    setSelected((prev) => (allPicked ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))))
  }

  const onDownload = async (d: Attachment) => {
    const blob = await downloadAttachment(d.id)
    triggerDownload(blob, d.display_name)
    setNotice(`${d.display_name} diunduh.`)
  }

  const openRename = (d: Attachment) => {
    setRenameTarget(d)
    setRenameDraft(d.display_name)
    setModalError('')
  }
  const saveRename = () => {
    if (!renameTarget) return
    // Rename lewat endpoint task-level (sama dengan Task Detail) --
    // halaman AW Documents tidak punya endpoint rename tersendiri, cukup
    // reuse PUT /attachments/:id yang sudah ada.
    import('@/features/attachments/api').then(({ renameAttachment }) =>
      renameAttachment(renameTarget.id, renameDraft).then(
        () => {
          setRenameTarget(null)
          setNotice(`Lampiran diganti nama menjadi "${renameDraft}".`)
          documents.refetch()
        },
        () => setModalError('Gagal mengganti nama lampiran.'),
      ),
    )
  }

  const openDelete = (targets: Attachment[]) => {
    setDeleteTargets(targets)
    setDeleteMode('retensi')
    setConfirmWsName('')
    setModalError('')
  }
  const confirmDelete = () => {
    if (!deleteTargets) return
    setModalError('')
    const ids = deleteTargets.map((d) => d.id)
    const onOk = (succeeded: number) => {
      setDeleteTargets(null)
      setSelected([])
      setNotice(
        deleteMode === 'permanen'
          ? `${succeeded} lampiran dihapus permanen -- kuota dibebaskan seketika tanpa masa retensi.`
          : `${succeeded} lampiran dihapus dan masuk masa retensi.`,
      )
      documents.refetch()
      quota.refetch()
    }
    const onErr = (err: unknown) => {
      setModalError(err instanceof ApiError && err.code === 'CONFIRM_MISMATCH' ? 'Nama workspace belum sama.' : 'Gagal menghapus lampiran.')
    }
    if (ids.length === 1) {
      deleteDoc.mutate(
        { id: ids[0], mode: deleteMode, confirmWorkspaceName: deleteMode === 'permanen' ? confirmWsName : undefined },
        { onSuccess: () => onOk(1), onError: onErr },
      )
    } else {
      bulkDelete.mutate(
        { ids, mode: deleteMode, confirmWorkspaceName: deleteMode === 'permanen' ? confirmWsName : undefined },
        { onSuccess: (res) => onOk(res.succeeded), onError: onErr },
      )
    }
  }

  const onRestore = (d: Attachment) => {
    restoreDoc.mutate(d.id, {
      onSuccess: () => {
        setNotice(`${d.display_name} dipulihkan dan kembali melekat pada task.`)
        documents.refetch()
      },
    })
  }

  const submitQuotaRequest = () => {
    const gb = parseInt(reqGb, 10)
    if (!Number.isFinite(gb) || gb <= 0) {
      setModalError('Jumlah tambahan kuota harus lebih dari 0.')
      return
    }
    requestQuota.mutate(
      { additionalGb: gb, reason: reqReason },
      {
        onSuccess: () => {
          setQuotaReqOpen(false)
          setNotice('Permintaan tambah kuota terkirim ke Group Admin.')
        },
        onError: () => setModalError('Gagal mengirim permintaan kuota.'),
      },
    )
  }

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex flex-wrap gap-3">
        <StatCard label="Total File" value={String(stats.total)} note="Seluruh workspace" />
        <StatCard label="Ukuran" value={stats.sizeLabel} note="File aktif" />
        <StatCard label="Orphan" value={String(stats.orphanCount)} note={stats.orphanCount ? 'Task induk terhapus' : 'Tidak ada'} tone={stats.orphanCount ? 'amber' : undefined} />
      </div>

      {notice && (
        <div className="relative border border-mint p-2.5 pr-8 font-mono text-[10px] leading-relaxed text-mint">
          ✓ {notice}
          <button type="button" onClick={() => setNotice('')} className="absolute right-2 top-2 text-mint/60 hover:text-mint" title="Tutup">
            ✕
          </button>
        </div>
      )}

      {/* KUOTA */}
      <div className="border border-line bg-panel">
        <button type="button" onClick={() => setQuotaOpen((v) => !v)} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left">
          <span className="w-2.5 font-mono text-[11px] text-text-muted">{quotaOpen ? '▾' : '▸'}</span>
          <span className="font-mono text-[9.5px] tracking-[0.14em] text-text-muted">KUOTA LAMPIRAN</span>
          {quota.data && (
            <span
              className={cn(
                'border px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.08em]',
                quotaCritical ? 'border-destructive text-destructive' : quotaWarn ? 'border-amber text-amber' : 'border-mint text-mint',
              )}
            >
              {quotaPct.toFixed(0)}%
            </span>
          )}
          {quota.data && (
            <span className="ml-auto font-mono text-[9px] text-text-dim">
              {formatBytes(quota.data.used_bytes)} / {formatBytes(quota.data.quota_bytes)}
            </span>
          )}
        </button>
        {quotaOpen && quota.data && (
          <div className="flex flex-col gap-3 border-t border-line p-3.5">
            <div className="h-2 bg-raised-1">
              <div
                className={cn('h-full', quotaCritical ? 'bg-destructive' : quotaWarn ? 'bg-amber' : 'bg-signal')}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              {quota.data.per_project.map((p) => {
                const pct = quota.data!.used_bytes > 0 ? (p.bytes / quota.data!.used_bytes) * 100 : 0
                return (
                  <div key={p.project_id} className="grid grid-cols-[minmax(100px,1.6fr)_60px_1fr_84px] items-center gap-2.5">
                    <span className="truncate font-mono text-[10px] text-text-muted">{p.project_name}</span>
                    <span className="font-mono text-[9px] text-text-dim">{p.file_count}</span>
                    <span className="h-1.5 bg-raised-1">
                      <span className="block h-full bg-signal" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="text-right font-mono text-[9.5px] text-text-dim">{formatBytes(p.bytes)}</span>
                  </div>
                )
              })}
              {quota.data.per_project.length === 0 && <p className="font-mono text-[9px] text-text-dim">Belum ada pemakaian.</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2.5 border-t border-line pt-3">
              <span className="min-w-[200px] flex-1 font-mono text-[9px] leading-relaxed text-text-dim">
                Alokasi kuota ditetapkan Group Admin di level organisasi dan dibagi seluruh workspace di dalamnya. Admin Workspace tidak dapat
                mengubahnya, tetapi dapat merapikan file atau mengajukan tambahan. Retensi organisasi: {quota.data.retention_days} hari.
              </span>
              <button
                type="button"
                onClick={() => { setQuotaReqOpen(true); setModalError(''); setReqGb('5'); setReqReason('') }}
                className="whitespace-nowrap border border-amber px-3.5 py-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-amber"
              >
                Minta Tambah Kuota
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FILTER */}
      <div className="border border-line bg-panel">
        <button type="button" onClick={() => setFiltersOpen((v) => !v)} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left">
          <span className="w-2.5 font-mono text-[11px] text-text-muted">{filtersOpen ? '▾' : '▸'}</span>
          <span className="font-mono text-[9.5px] tracking-[0.14em] text-text-muted">FILTER</span>
          <span className="ml-auto font-mono text-[9px] text-text-dim">
            {currentPage}/{totalPages} · {filtered.length} data
          </span>
        </button>
        {filtersOpen && (
          <div className="flex flex-col gap-3.5 border-t border-line p-3.5">
            <div className="flex flex-wrap gap-3.5">
              <div className="flex min-w-[190px] flex-1 flex-col gap-1.5">
                <label className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">PROJECT</label>
                <select
                  value={fProject}
                  onChange={(e) => { setFProject(e.target.value); setPage(1) }}
                  className="border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[11px] text-text-bone outline-none"
                >
                  <option value="">Semua</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
                <label className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">STATUS</label>
                <select
                  value={fStatus}
                  onChange={(e) => { setFStatus(e.target.value); setPage(1) }}
                  className="border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[11px] text-text-bone outline-none"
                >
                  <option value="">Aktif & Orphan</option>
                  <option value="active">Aktif</option>
                  <option value="orphan">Orphan</option>
                  <option value="deleted">Terhapus</option>
                  <option value="all">Semua</option>
                </select>
              </div>
              <div className="flex min-w-[110px] flex-col gap-1.5">
                <label className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">TIPE FILE</label>
                <select
                  value={fExt}
                  onChange={(e) => { setFExt(e.target.value); setPage(1) }}
                  className="border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[11px] text-text-bone outline-none"
                >
                  <option value="">Semua</option>
                  {exts.map((e) => (
                    <option key={e} value={e}>{e.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3.5">
              <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                <label className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">PENGUNGGAH</label>
                <select
                  value={fUploader}
                  onChange={(e) => { setFUploader(e.target.value); setPage(1) }}
                  className="border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[11px] text-text-bone outline-none"
                >
                  <option value="">Semua</option>
                  {uploaders.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-[150px] flex-col gap-1.5">
                <label className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">URUTKAN</label>
                <select
                  value={fSort}
                  onChange={(e) => { setFSort(e.target.value); setPage(1) }}
                  className="border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[11px] text-text-bone outline-none"
                >
                  <option value="">Terbesar</option>
                  <option value="smallest">Terkecil</option>
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="name">Nama A-Z</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => { setFProject(''); setFStatus(''); setFExt(''); setFUploader(''); setFSort(''); setPage(1) }}
                className="border border-line-strong px-3.5 py-2 font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-muted"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border border-destructive bg-destructive/5 px-3.5 py-2.5">
          <span className="font-mono text-[10px] text-text-bone">{selected.length} lampiran dipilih</span>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => setSelected([])} className="border border-line-strong px-3 py-2 font-mono text-[9.5px] uppercase text-text-muted">
              Batal Pilih
            </button>
            <button
              type="button"
              onClick={() => openDelete(all.filter((d) => selected.includes(d.id)))}
              className="bg-destructive px-3.5 py-2 font-mono text-[9.5px] font-bold uppercase text-white"
            >
              Hapus Terpilih
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[600px] text-left">
          <thead>
            <tr className="border-b border-line bg-raised-1 font-mono text-[9px] tracking-[0.1em] text-text-dim">
              <th className="px-2.5 py-2.5">
                <span onClick={toggleSelectAllOnPage} className="cursor-pointer text-[11px]">
                  {paged.length > 0 && paged.every((d) => selected.includes(d.id)) ? '◼' : '◻'}
                </span>
              </th>
              <th className="px-2.5 py-2.5">FILE</th>
              <th className="px-2.5 py-2.5">TASK · PROJECT</th>
              <th className="px-2.5 py-2.5">PENGUNGGAH</th>
              <th className="px-2.5 py-2.5">AKSI</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((d) => {
              const badge = statusBadge(d.status)
              const picked = selected.includes(d.id)
              return (
                <tr key={d.id} className={cn('border-b border-line-subtle align-top', picked && 'bg-signal/5')}>
                  <td className="px-2.5 py-3">
                    <span onClick={() => toggleSelect(d.id)} className="cursor-pointer font-mono text-[11px] text-text-muted">
                      {picked ? '◼' : '◻'}
                    </span>
                  </td>
                  <td className="px-2.5 py-3">
                    <div className="text-[12.5px] text-text-bone">{d.display_name}</div>
                    <div className="mt-1 font-mono text-[8.5px] text-text-dim">{formatBytes(d.size_bytes)} · {fileExt(d.original_name).toUpperCase()}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={cn('border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold', badge.tone)}>{badge.label}</span>
                      {d.status !== 'active' && (
                        <span className="font-mono text-[8.5px] text-amber">
                          {d.status === 'deleted' ? 'dihapus' : 'task dihapus'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2.5 py-3">
                    <div className="font-mono text-[10px] text-signal">{d.task_code}</div>
                    <div className="mt-0.5 truncate text-[11px] text-text-muted">{d.task_title}</div>
                    <div className="mt-0.5 font-mono text-[8.5px] text-text-dim">{d.project_name}</div>
                  </td>
                  <td className="px-2.5 py-3">
                    <div className="text-[11.5px] text-text-muted">{d.uploader_name || d.uploader_email}</div>
                    <div className="mt-1 font-mono text-[8.5px] text-text-dim">{new Date(d.created_at).toLocaleDateString('id-ID')}</div>
                  </td>
                  <td className="px-2.5 py-3">
                    <div className="flex flex-wrap gap-2.5">
                      <button type="button" onClick={() => onDownload(d)} className="font-mono text-[10px] text-signal hover:underline">Unduh</button>
                      {d.status !== 'deleted' && (
                        <button type="button" onClick={() => openRename(d)} className="font-mono text-[10px] text-text-muted hover:text-signal">Rename</button>
                      )}
                      {d.status !== 'deleted' && (
                        <button type="button" onClick={() => openDelete([d])} className="font-mono text-[10px] text-destructive hover:underline">Hapus</button>
                      )}
                      {d.status === 'deleted' && (
                        <button type="button" onClick={() => onRestore(d)} className="font-mono text-[10px] text-mint hover:underline">Pulihkan</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {documents.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
        {paged.length === 0 && !documents.isLoading && (
          <p className="p-6 text-center font-mono text-[10.5px] text-text-muted">Tidak ada dokumen pada filter ini.</p>
        )}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase text-text-muted disabled:opacity-40">
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
                className="w-11 border border-line-strong bg-input-bg px-1 py-0.5 text-center font-mono text-[10px] text-text-body outline-none"
                aria-label="Nomor halaman"
              />
              / {totalPages} · {filtered.length} data
              <button type="button" onClick={() => goToPage(pageInputRef.current?.value ?? '')} className="border border-line-strong px-1.5 py-0.5 font-mono text-[9px] uppercase text-text-muted">
                Ke
              </button>
            </span>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase text-text-muted disabled:opacity-40">
              Brkt →
            </button>
          </div>
        )}
      </div>

      {/* MODAL RENAME */}
      {renameTarget && (
        <div onClick={() => setRenameTarget(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-6">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] border border-line-strong bg-panel">
            <div className="border-b border-line px-5 py-4">
              <div className="font-mono text-[9px] tracking-[0.16em] text-signal">GANTI NAMA LAMPIRAN</div>
              <div className="mt-1.5 text-[13px] text-text-muted">{renameTarget.display_name}</div>
            </div>
            <div className="flex flex-col gap-3.5 px-5 py-5">
              <div>
                <label className="mb-1.5 block font-mono text-[8.5px] tracking-[0.14em] text-text-dim">NAMA TAMPIL</label>
                <input
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  className="w-full border border-line-strong bg-input-bg px-3 py-2.5 text-[12.5px] text-text-bone outline-none focus-visible:border-signal"
                />
              </div>
              <p className="font-mono text-[9px] leading-relaxed text-text-dim">Hanya nama tampil yang berubah; nama fisik di storage tetap.</p>
              {modalError && <p className="font-mono text-[9.5px] text-destructive">⚠ {modalError}</p>}
              <div className="flex gap-2.5">
                <button type="button" onClick={saveRename} disabled={renameDraft.trim() === ''} className="bg-signal px-5 py-2.5 font-mono text-[10.5px] font-bold uppercase text-bg-deep disabled:opacity-50">
                  Simpan Nama
                </button>
                <button type="button" onClick={() => setRenameTarget(null)} className="border border-line-strong px-5 py-2.5 font-mono text-[10.5px] uppercase text-text-muted">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE (retensi/permanen) */}
      {deleteTargets && (
        <div onClick={() => setDeleteTargets(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-6">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[620px] border border-destructive bg-panel">
            <div className="border-b border-line px-5 py-4">
              <div className="font-mono text-[9px] tracking-[0.16em] text-destructive">HAPUS {deleteTargets.length > 1 ? `${deleteTargets.length} LAMPIRAN` : 'LAMPIRAN'}</div>
              <div className="mt-1.5 text-[14px] font-bold text-text-bone">
                {deleteTargets.length === 1 ? deleteTargets[0].display_name : `${deleteTargets.length} file terpilih`}
              </div>
            </div>
            <div className="flex flex-col gap-3.5 px-5 py-5">
              <div className="flex flex-col border border-line">
                <button
                  type="button"
                  onClick={() => setDeleteMode('retensi')}
                  className={cn('flex flex-col gap-1 border-b border-line-subtle px-3.5 py-3 text-left', deleteMode === 'retensi' && 'bg-signal/10')}
                >
                  <span className="font-mono text-[10px] text-text-bone">{deleteMode === 'retensi' ? '◉' : '○'} RETENSI (DEFAULT)</span>
                  <span className="text-[11px] text-text-muted">Masuk masa retensi organisasi, dapat dipulihkan selama periode retensi berjalan.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteMode('permanen')}
                  className={cn('flex flex-col gap-1 px-3.5 py-3 text-left', deleteMode === 'permanen' && 'bg-destructive/10')}
                >
                  <span className="font-mono text-[10px] text-destructive">{deleteMode === 'permanen' ? '◉' : '○'} PERMANEN</span>
                  <span className="text-[11px] text-text-muted">Dihapus seketika, kuota langsung dibebaskan. Tidak dapat dipulihkan.</span>
                </button>
              </div>
              {deleteMode === 'permanen' && (
                <div className="flex flex-col gap-2 border border-dashed border-destructive p-3.5">
                  <div className="font-mono text-[9px] tracking-[0.12em] text-destructive">KONFIRMASI PENGHAPUSAN PERMANEN</div>
                  <div className="font-mono text-[9.5px] leading-relaxed text-text-muted">Ketik nama workspace untuk melanjutkan.</div>
                  <input
                    value={confirmWsName}
                    onChange={(e) => setConfirmWsName(e.target.value)}
                    placeholder="Nama workspace"
                    className="border border-line-strong bg-input-bg px-3 py-2.5 text-[12px] text-text-bone outline-none focus-visible:border-signal"
                  />
                </div>
              )}
              <p className="font-mono text-[9px] leading-relaxed text-text-dim">
                Penghapusan mencatat aktor, waktu, nama file, dan ukuran di Audit Trail workspace.
              </p>
              {modalError && <p className="font-mono text-[9.5px] text-destructive">⚠ {modalError}</p>}
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteDoc.isPending || bulkDelete.isPending || (deleteMode === 'permanen' && confirmWsName.trim() === '')}
                  className="bg-destructive px-5 py-2.5 font-mono text-[10.5px] font-bold uppercase text-white disabled:opacity-50"
                >
                  {deleteMode === 'permanen' ? 'Hapus Permanen' : 'Hapus'}
                </button>
                <button type="button" onClick={() => setDeleteTargets(null)} className="border border-line-strong px-5 py-2.5 font-mono text-[10.5px] uppercase text-text-muted">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MINTA TAMBAH KUOTA */}
      {quotaReqOpen && (
        <div onClick={() => setQuotaReqOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-6">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[520px] border border-amber bg-panel">
            <div className="border-b border-line px-5 py-4">
              <div className="font-mono text-[9px] tracking-[0.16em] text-amber">MINTA TAMBAH KUOTA</div>
            </div>
            <div className="flex flex-col gap-3.5 px-5 py-5">
              <div className="flex flex-wrap gap-3">
                <div className="flex min-w-[110px] flex-col gap-1.5">
                  <label className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">TAMBAHAN (GB)</label>
                  <input
                    value={reqGb}
                    onChange={(e) => setReqGb(e.target.value.replace(/[^0-9]/g, ''))}
                    className="border border-line-strong bg-input-bg px-3 py-2.5 text-[12px] text-text-bone outline-none focus-visible:border-signal"
                  />
                </div>
                <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                  <label className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">ALASAN</label>
                  <input
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    placeholder="mis. migrasi arsip vendor"
                    className="border border-line-strong bg-input-bg px-3 py-2.5 text-[12px] text-text-bone outline-none focus-visible:border-signal"
                  />
                </div>
              </div>
              <p className="font-mono text-[9px] leading-relaxed text-text-dim">Permintaan dikirim ke Group Admin organisasi ini, tercatat di Audit Trail.</p>
              {modalError && <p className="font-mono text-[9.5px] text-destructive">⚠ {modalError}</p>}
              <div className="flex gap-2.5">
                <button type="button" onClick={submitQuotaRequest} disabled={requestQuota.isPending} className="bg-amber px-5 py-2.5 font-mono text-[10.5px] font-bold uppercase text-bg-deep disabled:opacity-50">
                  Kirim Permintaan
                </button>
                <button type="button" onClick={() => setQuotaReqOpen(false)} className="border border-line-strong px-5 py-2.5 font-mono text-[10.5px] uppercase text-text-muted">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
