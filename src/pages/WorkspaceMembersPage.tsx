import { useState } from 'react'
import { useParams } from 'react-router-dom'

import InviteMemberModal from '@/components/workspace/InviteMemberModal'
import { PendingInvitationsSection } from '@/components/workspace/PendingInvitationsSection'
import RolePickerModal from '@/components/workspace/RolePickerModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRemoveMember, useWorkspaceMembers } from '@/features/workspace-members/hooks'
import type { WorkspaceMember } from '@/features/workspace-members/types'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

// S2-07/08, US-002 (AW Members Roles.dc.html) -- versi minimal: cuma
// tabel member + aksi kelola role, TANPA stats/filter/pagination/undang
// member dari desain (di luar scope S2, GET .../members sendiri baru
// prasyarat minimal yang dimajukan dari S3-14, lihat
// implementation_gaps.md IG-09). Halaman penuh menyusul S3/S6.
//
// S3-18 (tombol hapus) + S3-43 (sembunyikan Undang Member/Kelola/Hapus
// berdasarkan workspace_role viewer sendiri, bukan cuma platform_role
// seperti RoleGuard S2-13) ditambahkan di sini. Baris viewer sendiri
// di-resolve dari response GET .../members yang sama (tidak perlu state
// "current workspace" global baru, sesuai catatan sprint_backlog.md).
function WorkspaceMembersPageContent() {
  const { wsId } = useParams<{ wsId: string }>()
  const workspaceId = wsId ?? ''
  const { data, isLoading, isError } = useWorkspaceMembers(workspaceId)
  const [selected, setSelected] = useState<WorkspaceMember | null>(null)
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const removeMember = useRemoveMember(workspaceId)
  const currentUser = useAuthStore((state) => state.user)
  const platformRole = currentUser?.platform_role

  const viewerRole = data?.find((m) => m.user_id === currentUser?.id)?.role
  const canManage = platformRole === 'platform_admin' || platformRole === 'group_admin' || viewerRole === 'admin_workspace'

  const handleConfirmRemove = () => {
    if (!removeTarget) return
    removeMember.mutate(removeTarget.user_id, { onSuccess: () => setRemoveTarget(null) })
  }

  return (
    <div className="min-h-screen bg-bg-deep">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">Member Workspace</h1>
          {canManage && (
            <Button onClick={() => setInviteOpen(true)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
              + Undang Member
            </Button>
          )}
        </div>

        {isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
        {isError && <p className="text-sm text-destructive">Gagal memuat daftar member.</p>}

        {data && (
          <Card className="border-line bg-transparent shadow-none">
            <CardHeader className="border-b border-line pb-3">
              <CardTitle className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                <div className="grid grid-cols-[1.8fr_1.2fr_1.1fr_0.9fr_0.8fr] gap-3">
                  <span>Member</span>
                  <span>Tipe</span>
                  <span>Role</span>
                  <span>Gabung</span>
                  <span>Aksi</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.length === 0 && <p className="p-4 text-sm text-text-muted">Belum ada member di workspace ini.</p>}
              {data.map((member) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  canManage={canManage}
                  onManage={() => setSelected(member)}
                  onRemove={() => setRemoveTarget(member)}
                />
              ))}
              {/* S2-14: seksi "Project-Scoped Member" (glossary.md --
                  Workspace Membership vs Project-Scoped Membership) belum
                  ditampilkan di sini -- datanya (`project_scoped_members`)
                  belum ada, S3-14 asli baru mengembalikan array itu setelah
                  tabel project_members dibangun (lihat implementation_gaps.md
                  IG-09/IG-17). Menyusul begitu datanya tersedia (S4+). */}
            </CardContent>
          </Card>
        )}

        <PendingInvitationsSection workspaceId={workspaceId} />
      </div>

      {/* workspaceName pakai workspaceId apa adanya -- GET /workspaces/:wsId
          (nama workspace sungguhan) belum diverifikasi hidup di S2, di luar
          scope prasyarat minimal S2-07/08. Ganti begitu S3 (workspace detail)
          selesai. */}
      <RolePickerModal
        workspaceId={workspaceId}
        workspaceName={workspaceId}
        member={selected}
        onClose={() => setSelected(null)}
      />
      <InviteMemberModal
        workspaceId={workspaceId}
        workspaceName={workspaceId}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />

      <Dialog open={removeTarget !== null} onOpenChange={(next) => !next && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keluarkan Member?</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-5">
            <p className="text-sm text-text-muted">
              {removeTarget?.display_name || removeTarget?.email} akan kehilangan akses ke workspace ini. Akun tetap ada,
              cuma keanggotaan workspace ini yang dicabut.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
              Batal
            </Button>
            <Button
              onClick={handleConfirmRemove}
              disabled={removeMember.isPending}
              className="border-destructive bg-destructive font-mono text-[10px] uppercase tracking-[0.06em] text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending ? 'Memproses...' : 'Keluarkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MemberRow({
  member,
  canManage,
  onManage,
  onRemove,
}: {
  member: WorkspaceMember
  canManage: boolean
  onManage: () => void
  onRemove: () => void
}) {
  const locked = member.role === 'admin_workspace'
  return (
    <div className="grid grid-cols-[1.8fr_1.2fr_1.1fr_0.9fr_0.8fr] items-center gap-3 border-t border-line px-4 py-3">
      <div>
        <div className="text-[13px] text-text-body">{member.display_name || member.email}</div>
        <div className="mt-1 font-mono text-[8.5px] text-text-muted">{member.email}</div>
      </div>
      {/* Istilah resmi glossary.md "Workspace Membership" -- bukan "Project
          Member" generik. Semua baris di sini SELALU tipe ini (data
          workspace_members saja) sampai project-scoped member ada. */}
      <span className="w-fit border border-line-subtle px-1.5 py-0.5 font-mono text-[8.5px] uppercase text-text-muted">
        Workspace Member
      </span>
      <span className="w-fit border border-line-strong px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-text-body">
        {member.role.replace('_', ' ')}
      </span>
      <span className="font-mono text-[10px] text-text-muted">
        {new Date(member.joined_at).toLocaleDateString('id-ID')}
      </span>
      {locked || !canManage ? (
        <span className="font-mono text-[10px] text-text-faint">{locked ? '— Kunci' : ''}</span>
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={onManage} className={cn('w-fit font-mono text-[10px] text-text-muted hover:text-signal')}>
            ✎ Kelola
          </button>
          <button onClick={onRemove} className="w-fit font-mono text-[10px] text-text-muted hover:text-destructive">
            ✕ Hapus
          </button>
        </div>
      )}
    </div>
  )
}

export default function WorkspaceMembersPage() {
  return (
    <ErrorBoundary>
      <WorkspaceMembersPageContent />
    </ErrorBoundary>
  )
}
