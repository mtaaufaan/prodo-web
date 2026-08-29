import { useMemo, useRef, useState } from 'react'

import GroupAdminFormModal, { type GroupAdminFormMode } from '@/components/GroupAdminFormModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import TierDistributionChart from '@/components/TierDistributionChart'
import { cn } from '@/lib/utils'
import { useGroupAdminList } from '@/features/platform-admin/hooks'
import type { GroupAdmin } from '@/features/platform-admin/types'

const GA_PAGE_SIZE = 10
const NEAR_QUOTA_THRESHOLD = 0.8

// usageRatio -- rasio pemakaian tertinggi di antara org/storage/member
// terhadap batas tier (null kalau GA belum punya grup -- tidak ada tier
// untuk dibandingkan). Dipakai untuk card "Mendekati Kuota" (>=80%,
// threshold sama dengan anomali storage Health Dashboard, dikonfirmasi
// user 2026-08-29) dan untuk urutan default grid.
function usageRatio(ga: GroupAdmin): number | null {
  if (ga.group_id == null) return null
  const orgRatio = ga.tier_max_org > 0 ? ga.used_org_count / ga.tier_max_org : 0
  const quotaGB = ga.storage_quota_gb ?? ga.tier_max_storage_gb
  const storageRatio = quotaGB > 0 ? ga.used_storage_mb / 1024 / quotaGB : 0
  const memberRatio = ga.tier_max_members > 0 ? ga.used_member_count / ga.tier_max_members : 0
  return Math.max(orgRatio, storageRatio, memberRatio)
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-pa-border p-4">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-1 font-mono text-[9.5px] text-text-muted">{sub}</div>}
    </div>
  )
}

// S1-12, US-073, diperluas S4P-06 sesuai desain "PA Group Admins": kolom
// Tier/Sisa Org/Sisa Kuota/Sisa Member/Tanggal Daftar, aksi Lihat/Ubah
// (bukan lagi form Tambah inline + tombol Resend -- Resend sekarang di
// dalam modal mode Ubah, sesuai desain "PA Group Admin Form").
//
// Sengaja TIDAK dibungkus shadcn Card -- desain aslinya flat, tanpa
// bg/shadow/rounded terpisah dari halaman, dan tanpa judul di dalam
// konten (nama halaman sudah ada di label nav sidebar). Card sebelumnya
// menambah "Group Admin Mgmt" 24px sans-serif yang tidak ada sama sekali
// di desain -- akar dari keluhan "style/font masih beda". Juga TANPA
// max-w -- desain "PA Group Admins" membiarkan tabel melebar penuh
// mengisi seluruh area konten (main), bukan dikunci ke lebar tetap.
function PlatformGroupAdminPageContent() {
  const list = useGroupAdminList()
  const [modal, setModal] = useState<{ mode: GroupAdminFormMode; id: string | null } | null>(null)
  const [page, setPage] = useState(1)

  // Urutan (dikonfirmasi user): status butuh perhatian dulu (SUSPENDED/
  // TIDAK AKTIF sebelum AKTIF), lalu di antara yang setara diurutkan
  // dari sisa kuota paling menipis dulu (usageRatio tertinggi).
  const sortedGAs = useMemo(() => {
    const data = list.data ?? []
    return [...data].sort((a, b) => {
      const aNeeds = a.status !== 'AKTIF'
      const bNeeds = b.status !== 'AKTIF'
      if (aNeeds !== bNeeds) return aNeeds ? -1 : 1
      return (usageRatio(b) ?? -1) - (usageRatio(a) ?? -1)
    })
  }, [list.data])

  const nearQuotaCount = sortedGAs.filter((ga) => (usageRatio(ga) ?? 0) >= NEAR_QUOTA_THRESHOLD).length
  const aktifCount = sortedGAs.filter((ga) => ga.status === 'AKTIF').length

  const totalPages = Math.max(1, Math.ceil(sortedGAs.length / GA_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedGAs = sortedGAs.slice((currentPage - 1) * GA_PAGE_SIZE, currentPage * GA_PAGE_SIZE)

  const pageInputRef = useRef<HTMLInputElement>(null)
  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    setPage(Math.min(totalPages, Math.max(1, n)))
  }

  return (
    <div className="space-y-3.5 p-6">
      {list.data && list.data.length > 0 && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <MetricCard
            label="Total Group Admin"
            value={String(list.data.length)}
            sub={`${aktifCount} aktif · ${list.data.length - aktifCount} tidak aktif`}
          />
          <TierDistributionChart groupAdmins={list.data} />
          <MetricCard label="Mendekati Kuota" value={String(nearQuotaCount)} sub="≥80% dari batas tier" />
        </div>
      )}

      <div className="flex items-center gap-3.5">
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setModal({ mode: 'add', id: null })}
          className="inline-flex items-center gap-2 border border-pa-accent px-3.5 py-2 font-mono text-[11px] tracking-[0.06em] text-pa-accent"
        >
          + Tambah Group Admin
        </button>
      </div>

      {list.isLoading && <p className="font-mono text-sm text-text-muted">Memuat...</p>}
      {list.isError && <p className="font-mono text-sm text-destructive">Gagal memuat daftar Group Admin.</p>}
      {list.data && list.data.length === 0 && <p className="font-mono text-sm text-text-muted">Belum ada Group Admin.</p>}
      {list.data && list.data.length > 0 && (
        <div className="overflow-x-auto border border-pa-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-pa-header text-left">
                {['Group Admin', 'Tier', 'Sisa Org', 'Sisa Kuota', 'Sisa Member', 'Kontrak Berakhir', 'Tanggal Daftar', 'Status', ''].map(
                  (h) => (
                    <th key={h} className="py-2.5 pl-3.5 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {pagedGAs.map((ga) => (
                <GroupAdminRow
                  key={ga.id}
                  groupAdmin={ga}
                  onView={() => setModal({ mode: 'view', id: ga.id })}
                  onEdit={() => setModal({ mode: 'edit', id: ga.id })}
                />
              ))}
            </tbody>
          </table>
          {sortedGAs.length > GA_PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-pa-border px-4 py-2.5">
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
                Berikutnya →
              </button>
            </div>
          )}
        </div>
      )}

      {modal && (
        <GroupAdminFormModal mode={modal.mode} groupAdminId={modal.id} open onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// Status pill: docs/design-system.md §8.1 -- border 1px status hue, mono
// uppercase, TANPA fill.
function StatusPill({ status }: { status: GroupAdmin['status'] }) {
  const styleByStatus: Record<GroupAdmin['status'], string> = {
    AKTIF: 'border-mint text-mint',
    SUSPENDED: 'border-red text-red',
    'TIDAK AKTIF': 'border-amber text-amber',
  }
  return (
    <span
      className={cn(
        'inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]',
        styleByStatus[status],
      )}
    >
      {status}
    </span>
  )
}

function GroupAdminRow({
  groupAdmin,
  onView,
  onEdit,
}: {
  groupAdmin: GroupAdmin
  onView: () => void
  onEdit: () => void
}) {
  const hasGroup = groupAdmin.group_id != null
  const sisaOrg = hasGroup ? Math.max(0, groupAdmin.tier_max_org - groupAdmin.used_org_count) : null
  const sisaKuotaGB = hasGroup
    ? Math.max(0, (groupAdmin.storage_quota_gb ?? groupAdmin.tier_max_storage_gb) - groupAdmin.used_storage_mb / 1024)
    : null
  const sisaMember = hasGroup ? Math.max(0, groupAdmin.tier_max_members - groupAdmin.used_member_count) : null

  return (
    <tr className="border-b border-line last:border-0">
      <td className="py-2.5 pl-3.5 pr-4">
        <div>{groupAdmin.display_name}</div>
        <div className="font-mono text-[10px] text-text-dim">{groupAdmin.email}</div>
      </td>
      <td className="py-2 pr-4 font-mono text-[10px] uppercase text-text-muted">{groupAdmin.tier ?? '—'}</td>
      <td className="py-2 pr-4 font-mono text-[11px] text-text-muted">{sisaOrg != null ? `${sisaOrg} org` : '—'}</td>
      <td className="py-2 pr-4 font-mono text-[11px] text-text-muted">
        {sisaKuotaGB != null ? `${sisaKuotaGB.toFixed(1).replace(/\.0$/, '')} GB` : '—'}
      </td>
      <td className="py-2 pr-4 font-mono text-[11px] text-text-muted">
        {sisaMember != null ? sisaMember.toLocaleString('id-ID') : '—'}
      </td>
      <td className="py-2 pr-4 font-mono text-[11px] text-text-muted">
        {groupAdmin.contract_end_at
          ? new Date(groupAdmin.contract_end_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—'}
      </td>
      <td className="py-2 pr-4 font-mono text-[11px] text-text-muted">
        {new Date(groupAdmin.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
      </td>
      <td className="py-2 pr-4">
        <StatusPill status={groupAdmin.status} />
      </td>
      <td className="py-2 pr-4 text-right">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onView}
            className="font-mono text-[10px] text-text-muted hover:text-mint"
          >
            ◱ Lihat
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="font-mono text-[10px] text-text-muted hover:text-pa-accent"
          >
            ✎ Ubah
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function PlatformGroupAdminPage() {
  return (
    <ErrorBoundary>
      <PlatformGroupAdminPageContent />
    </ErrorBoundary>
  )
}
