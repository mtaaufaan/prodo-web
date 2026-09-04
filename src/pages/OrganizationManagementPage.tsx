import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import CreateOrganizationModal from '@/components/organizations/CreateOrganizationModal'
import ManageOrganizationModal from '@/components/organizations/ManageOrganizationModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useOrganizationList } from '@/features/organizations/hooks'
import type { Organization } from '@/features/organizations/types'
import { cn, logoBgClass } from '@/lib/utils'

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
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  // Baris tab tampilan (Semua/Aktif/Nonaktif) & tombol CTA topbar datang
  // dari GroupAdminLayout (S4G-03 fix, desain "Master UI Group Admin.dc.html")
  // -- undefined kalau dirender polos untuk Platform Admin (shell-nya cuma
  // <Outlet/> tanpa context, lihat GroupAdminLayout) -- PA TIDAK PUNYA
  // topbar sama sekali, jadi tetap butuh tombol create di dalam halaman
  // sendiri (lihat isBareRender di bawah), beda dari GA yang sekarang
  // pakai CTA topbar (bukan lagi tombol duplikat di halaman). `groupId`
  // (S4G-32, group switcher) -- undefined untuk PA (lintas grup, tidak
  // difilter, perilaku lama), grup yang sedang aktif dipilih untuk GA.
  const outletContext = useOutletContext<GroupAdminOutletContext>()
  const isBareRender = !outletContext
  const { view, registerCta, groupId } = outletContext ?? { view: 'Semua', registerCta: () => {}, groupId: undefined }
  const list = useOrganizationList(groupId)
  // Daftarkan handler tombol "+ Buat Organisasi" topbar sekali saat mount --
  // sebelumnya tombol ini duplikat di dalam halaman (di luar desain sama
  // sekali, ditemukan user lewat login ke demo interaktif sungguhan).
  useEffect(() => {
    registerCta(() => setCreateOpen(true))
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Derivasi dari list.data (bukan simpan object organisasi apa adanya di
  // state) -- supaya modal ikut lihat deactivated_at/kuota terbaru setelah
  // toggle/simpan sukses (query di-invalidate, list refetch), bukan snapshot
  // basi dari saat tombol Kelola diklik.
  const orgs = useMemo(() => list.data?.organizations ?? [], [list.data])
  const selected = orgs.find((o) => o.id === selectedId) ?? null

  // Stats selalu dari SELURUH organisasi (bukan hasil filter) -- sama
  // dengan desain (__vals() hitung dari `all`, bukan `rows`).
  const stats = useMemo(() => {
    const aktif = orgs.filter((o) => o.deactivated_at === null).length
    const allocatedBytes = orgs.reduce((sum, o) => sum + o.storage_quota_bytes, 0)
    const usedBytes = orgs.reduce((sum, o) => sum + o.storage_used_bytes, 0)
    return { total: orgs.length, aktif, nonaktif: orgs.length - aktif, allocatedBytes, usedBytes }
  }, [orgs])
  const ceilingBytes = list.data?.group_storage_ceiling_bytes ?? 0

  const filteredOrgs = useMemo(() => {
    if (view === 'Aktif') return orgs.filter((o) => o.deactivated_at === null)
    if (view === 'Nonaktif') return orgs.filter((o) => o.deactivated_at !== null)
    return orgs
  }, [orgs, view])
  useEffect(() => setPage(1), [view])

  const totalPages = Math.max(1, Math.ceil(filteredOrgs.length / ORG_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedOrgs = filteredOrgs.slice((currentPage - 1) * ORG_PAGE_SIZE, currentPage * ORG_PAGE_SIZE)
  const pageInputRef = useRef<HTMLInputElement>(null)
  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    setPage(Math.min(totalPages, Math.max(1, n)))
  }

  return (
    <>
      <div className="space-y-3.5 p-6">
        {/* Platform Admin lihat halaman ini polos, TANPA shell/topbar sama
            sekali (lihat GroupAdminLayout) -- tombol create SATU-SATUNYA
            cuma ada di sini untuk PA. Group Admin pakai CTA topbar. */}
        {isBareRender && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="bg-signal px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-bg-deep"
            >
              + Buat Organisasi
            </button>
          </div>
        )}

        {/* Selalu tampil, TERMASUK saat 0 organisasi (dengan angka 0) --
            desain "GA Organizations.dc.html" render 5 kartu ini via sc-for
            tanpa syarat sama sekali. Sebelumnya digerbangi `orgs.length > 0`,
            jadi grup yang baru dibuat/belum punya organisasi (kasus nyata
            ditemukan user: "RDS Group") tidak pernah melihat stats bar. */}
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
          {filteredOrgs.length === 0 && !list.isLoading && (
            <p className="p-4 text-sm text-text-muted">
              {orgs.length === 0 ? 'Belum ada organisasi.' : 'Tidak ada organisasi berstatus ini.'}
            </p>
          )}
          {pagedOrgs.map((org) => (
            <OrganizationRow key={org.id} organization={org} onManage={() => setSelectedId(org.id)} />
          ))}
          {filteredOrgs.length > ORG_PAGE_SIZE && (
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
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center text-[12px] font-extrabold text-bg-deep',
            logoBgClass(organization.id),
          )}
        >
          {organization.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <div className="text-[13px] text-text-body">{organization.name}</div>
          <div className="font-mono text-[10px] text-text-muted">{organization.domain || organization.slug}</div>
        </div>
      </div>
      <Link
        to={`/workspaces?org_id=${organization.id}`}
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
