import { useState } from 'react'
import { Link } from 'react-router-dom'

import CreateOrganizationModal from '@/components/organizations/CreateOrganizationModal'
import ManageOrganizationModal from '@/components/organizations/ManageOrganizationModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganizationList } from '@/features/organizations/hooks'
import type { Organization } from '@/features/organizations/types'
import { cn } from '@/lib/utils'

// S3-07, US-007 (GA Organizations.dc.html) -- versi minimal: list + form
// buat/edit + toggle aktif/nonaktif + ringkasan (S3-06), sesuai AC
// sprint_backlog.md. Bukan `src/pages/admin/` seperti wording asli --
// disamakan dengan struktur flat `src/pages/` yang sudah dipakai seluruh
// halaman lain (PlatformGroupAdminPage dkk).
function OrganizationManagementPageContent() {
  const list = useOrganizationList()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Derivasi dari list.data (bukan simpan object organisasi apa adanya di
  // state) -- supaya modal ikut lihat deactivated_at terbaru setelah
  // toggle sukses (query di-invalidate, list refetch), bukan snapshot basi
  // dari saat tombol Kelola diklik.
  const selected = list.data?.find((o) => o.id === selectedId) ?? null

  return (
    <div className="min-h-screen bg-bg-deep">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">Organisasi</h1>
          <Button onClick={() => setCreateOpen(true)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            + Buat Organisasi
          </Button>
        </div>

        <Card className="border-line bg-transparent shadow-none">
          <CardHeader className="border-b border-line pb-3">
            <CardTitle className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
              <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.7fr_0.7fr] gap-3">
                <span>Nama</span>
                <span>Slug</span>
                <span>Status</span>
                <span>Workspace</span>
                <span>Aksi</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {list.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
            {list.isError && <p className="p-4 text-sm text-destructive">Gagal memuat daftar organisasi.</p>}
            {list.data && list.data.length === 0 && (
              <p className="p-4 text-sm text-text-muted">Belum ada organisasi.</p>
            )}
            {list.data?.map((org) => (
              <OrganizationRow key={org.id} organization={org} onManage={() => setSelectedId(org.id)} />
            ))}
          </CardContent>
        </Card>
      </div>

      <CreateOrganizationModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ManageOrganizationModal organization={selected} onClose={() => setSelectedId(null)} />
    </div>
  )
}

function OrganizationRow({ organization, onManage }: { organization: Organization; onManage: () => void }) {
  const isActive = organization.deactivated_at === null
  return (
    <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.7fr_0.7fr] items-center gap-3 border-t border-line px-4 py-3">
      <div className="text-[13px] text-text-body">{organization.name}</div>
      <div className="font-mono text-[10px] text-text-muted">{organization.slug}</div>
      <span
        className={cn(
          'w-fit border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]',
          isActive ? 'border-mint text-mint' : 'border-destructive text-destructive',
        )}
      >
        {isActive ? 'Aktif' : 'Nonaktif'}
      </span>
      <Link
        to={`/organizations/${organization.id}/workspaces`}
        className="w-fit font-mono text-[10px] text-text-muted hover:text-signal"
      >
        Lihat →
      </Link>
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
