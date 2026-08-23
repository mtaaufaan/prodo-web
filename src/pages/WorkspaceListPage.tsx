import { useState } from 'react'
import { useParams } from 'react-router-dom'

import CreateWorkspaceModal from '@/components/workspaces/CreateWorkspaceModal'
import ManageWorkspaceModal from '@/components/workspaces/ManageWorkspaceModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useWorkspaceList } from '@/features/workspaces/hooks'
import type { Workspace } from '@/features/workspaces/types'
import { cn } from '@/lib/utils'

// S3-13, US-008 (GA Workspaces.dc.html) -- versi minimal: list + form
// buat/edit + toggle aktif/nonaktif, sesuai AC sprint_backlog.md. TANPA
// stats/storage gauge/filter/pagination dari desain penuh -- sama pola
// OrganizationManagementPage.
function WorkspaceListPageContent() {
  const { orgId } = useParams<{ orgId: string }>()
  const organizationId = orgId ?? ''
  const list = useWorkspaceList(organizationId)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Derivasi dari list.data (bukan simpan object workspace apa adanya di
  // state) -- pelajaran dari ManageOrganizationModal (S3-07): modal harus
  // ikut lihat archived_at terbaru setelah toggle sukses, bukan snapshot
  // basi dari saat tombol Kelola diklik.
  const selected = list.data?.find((w) => w.id === selectedId) ?? null

  return (
    <div className="min-h-screen bg-bg-deep">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">Workspace</h1>
          <Button onClick={() => setCreateOpen(true)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            + Buat Workspace
          </Button>
        </div>

        <Card className="border-line bg-transparent shadow-none">
          <CardHeader className="border-b border-line pb-3">
            <CardTitle className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
              <div className="grid grid-cols-[1.8fr_0.9fr_0.8fr] gap-3">
                <span>Nama</span>
                <span>Status</span>
                <span>Aksi</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {list.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
            {list.isError && <p className="p-4 text-sm text-destructive">Gagal memuat daftar workspace.</p>}
            {list.data && list.data.length === 0 && (
              <p className="p-4 text-sm text-text-muted">Belum ada workspace.</p>
            )}
            {list.data?.map((ws) => (
              <WorkspaceRow key={ws.id} workspace={ws} onManage={() => setSelectedId(ws.id)} />
            ))}
          </CardContent>
        </Card>
      </div>

      <CreateWorkspaceModal orgId={organizationId} open={createOpen} onClose={() => setCreateOpen(false)} />
      <ManageWorkspaceModal orgId={organizationId} workspace={selected} onClose={() => setSelectedId(null)} />
    </div>
  )
}

function WorkspaceRow({ workspace, onManage }: { workspace: Workspace; onManage: () => void }) {
  const isActive = workspace.archived_at === null
  return (
    <div className="grid grid-cols-[1.8fr_0.9fr_0.8fr] items-center gap-3 border-t border-line px-4 py-3">
      <div className="text-[13px] text-text-body">{workspace.name}</div>
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

export default function WorkspaceListPage() {
  return (
    <ErrorBoundary>
      <WorkspaceListPageContent />
    </ErrorBoundary>
  )
}
