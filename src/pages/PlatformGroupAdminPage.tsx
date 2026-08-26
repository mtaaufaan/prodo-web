import { useState } from 'react'

import GroupAdminFormModal, { type GroupAdminFormMode } from '@/components/GroupAdminFormModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { cn } from '@/lib/utils'
import { useGroupAdminList } from '@/features/platform-admin/hooks'
import type { GroupAdmin } from '@/features/platform-admin/types'

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

  return (
    <div className="space-y-3.5 p-6">
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
                {['Group Admin', 'Tier', 'Sisa Org', 'Sisa Kuota', 'Sisa Member', 'Tanggal Daftar', 'Status', ''].map(
                  (h) => (
                    <th key={h} className="py-2.5 pl-3.5 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {list.data.map((ga) => (
                <GroupAdminRow
                  key={ga.id}
                  groupAdmin={ga}
                  onView={() => setModal({ mode: 'view', id: ga.id })}
                  onEdit={() => setModal({ mode: 'edit', id: ga.id })}
                />
              ))}
            </tbody>
          </table>
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
