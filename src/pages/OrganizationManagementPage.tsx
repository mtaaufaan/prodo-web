import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import CreateOrganizationModal from '@/components/organizations/CreateOrganizationModal'
import ManageOrganizationModal from '@/components/organizations/ManageOrganizationModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { useOrganizationList } from '@/features/organizations/hooks'
import type { Organization } from '@/features/organizations/types'
import { cn } from '@/lib/utils'

const GB = 1024 * 1024 * 1024
const ORG_PAGE_SIZE = 10

// bg-panel (S4G-03 fix, ditemukan user 2026-08-30): desain
// "GA Organizations.dc.html" kartu stat punya background:oklch(0.19...)
// -- persis token bg-panel -- BEDA dari background halaman (bg-content,
// oklch(0.175...)). Tanpa ini kartu blend ke background halaman dan
// tidak terbaca sebagai "card" sama sekali (cuma border tipis).
function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'mint' | 'destructive' | 'signal' }) {
  return (
    <div className="flex-1 min-w-[130px] border border-line bg-panel p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">{label}</div>
      <div
        className={cn(
          'mt-1.5 text-2xl font-bold',
          tone === 'mint' && 'text-mint',
          tone === 'destructive' && 'text-destructive',
          tone === 'signal' && 'text-signal',
        )}
      >
        {value}
      </div>
    </div>
  )
}

// S4G-03, Track S4G (desain "GA Organizations.dc.html") -- diperkaya dari
// versi minimal S3-07: stats bar, tabel dengan storage bar berwarna
// threshold + WS/member count, pagination 10/hal (pola inline sama
// PlatformGroupAdminPage dkk -- tidak ada komponen pagination shared di
// codebase ini). Bukan `src/pages/admin/` seperti wording asli S3-07 --
// disamakan dengan struktur flat `src/pages/` yang sudah dipakai seluruh
// halaman lain.
function OrganizationManagementPageContent() {
  const list = useOrganizationList()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  // Derivasi dari list.data (bukan simpan object organisasi apa adanya di
  // state) -- supaya modal ikut lihat deactivated_at/kuota terbaru setelah
  // toggle/simpan sukses (query di-invalidate, list refetch), bukan snapshot
  // basi dari saat tombol Kelola diklik.
  const orgs = useMemo(() => list.data?.organizations ?? [], [list.data])
  const selected = orgs.find((o) => o.id === selectedId) ?? null

  const stats = useMemo(() => {
    const aktif = orgs.filter((o) => o.deactivated_at === null).length
    const allocatedBytes = orgs.reduce((sum, o) => sum + o.storage_quota_bytes, 0)
    const usedBytes = orgs.reduce((sum, o) => sum + o.storage_used_bytes, 0)
    return { total: orgs.length, aktif, nonaktif: orgs.length - aktif, allocatedBytes, usedBytes }
  }, [orgs])
  const ceilingBytes = list.data?.group_storage_ceiling_bytes ?? 0

  const totalPages = Math.max(1, Math.ceil(orgs.length / ORG_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedOrgs = orgs.slice((currentPage - 1) * ORG_PAGE_SIZE, currentPage * ORG_PAGE_SIZE)
  const pageInputRef = useRef<HTMLInputElement>(null)
  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    setPage(Math.min(totalPages, Math.max(1, n)))
  }

  return (
    <>
      <div className="space-y-3.5 p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">Organisasi</h1>
          <Button onClick={() => setCreateOpen(true)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            + Buat Organisasi
          </Button>
        </div>

        {orgs.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <StatCard label="Total Organisasi" value={String(stats.total)} />
            <StatCard label="Aktif" value={String(stats.aktif)} tone="mint" />
            <StatCard label="Nonaktif" value={String(stats.nonaktif)} tone="destructive" />
            <StatCard
              label="Kuota Teralokasi"
              value={ceilingBytes > 0 ? `${(stats.allocatedBytes / GB).toFixed(0)} / ${(ceilingBytes / GB).toFixed(0)} GB` : `${(stats.allocatedBytes / GB).toFixed(0)} GB`}
              tone="signal"
            />
            <StatCard label="Storage Terpakai" value={`${(stats.usedBytes / GB).toFixed(1)} GB`} />
          </div>
        )}

        <div className="border border-line">
          {/* bg-raised-2 (S4G-03 fix, ditemukan user 2026-08-30): header grid
              desain punya background:oklch(0.215...) -- persis token
              bg-raised-2, jelas lebih terang dari background halaman --
              sebelumnya tidak diset sama sekali jadi warnanya salah. */}
          <div className="border-b border-line bg-raised-2 px-4 py-2.5">
            <div className="grid grid-cols-[1.4fr_0.9fr_1.3fr_0.7fr_0.65fr] gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
              <span>Organisasi</span>
              <span>WS · Member</span>
              <span>Storage</span>
              <span>Status</span>
              <span>Aksi</span>
            </div>
          </div>
          {list.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
          {list.isError && <p className="p-4 text-sm text-destructive">Gagal memuat daftar organisasi.</p>}
          {orgs.length === 0 && !list.isLoading && <p className="p-4 text-sm text-text-muted">Belum ada organisasi.</p>}
          {pagedOrgs.map((org) => (
            <OrganizationRow key={org.id} organization={org} onManage={() => setSelectedId(org.id)} />
          ))}
          {orgs.length > ORG_PAGE_SIZE && (
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

      <CreateOrganizationModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ManageOrganizationModal organization={selected} onClose={() => setSelectedId(null)} />
    </>
  )
}

function OrganizationRow({ organization, onManage }: { organization: Organization; onManage: () => void }) {
  const isActive = organization.deactivated_at === null
  const pct = organization.storage_quota_bytes > 0 ? (organization.storage_used_bytes / organization.storage_quota_bytes) * 100 : 0
  const barTone = pct >= 80 ? 'bg-destructive' : pct >= 60 ? 'bg-amber' : 'bg-mint'

  return (
    <div className="grid grid-cols-[1.4fr_0.9fr_1.3fr_0.7fr_0.65fr] items-center gap-3 border-t border-line px-4 py-3">
      <div>
        <div className="text-[13px] text-text-body">{organization.name}</div>
        <div className="font-mono text-[10px] text-text-muted">{organization.domain || organization.slug}</div>
      </div>
      <Link
        to={`/organizations/${organization.id}/workspaces`}
        className="font-mono text-[11px] text-text-body hover:text-signal"
      >
        {organization.workspace_count} · {organization.member_count}
      </Link>
      <div>
        <div className="flex items-baseline justify-between font-mono text-[10px] text-text-muted">
          <span>
            {(organization.storage_used_bytes / GB).toFixed(1)} / {(organization.storage_quota_bytes / GB).toFixed(1)} GB
          </span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="mt-1 h-[5px] w-full bg-line-subtle">
          <div className={cn('h-full', barTone)} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      </div>
      <span
        className={cn(
          'w-fit border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]',
          isActive ? 'border-mint text-mint' : 'border-destructive text-destructive',
        )}
      >
        {isActive ? 'Aktif' : 'Nonaktif'}
      </span>
      <button onClick={onManage} className="w-fit font-mono text-[10px] text-text-muted hover:text-signal">
        ✎ Kelola
      </button>
    </div>
  )
}

export default function OrganizationManagementPage() {
  return (
    <ErrorBoundary>
      <OrganizationManagementPageContent />
    </ErrorBoundary>
  )
}
