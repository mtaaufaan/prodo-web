import { useState } from 'react'
import { useParams } from 'react-router-dom'

import AddMemberModal from '@/components/projects/AddMemberModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useProjectMembers, useRemoveProjectMember, useUpdateProjectMemberRole } from '@/features/project-members/hooks'
import { PROJECT_SCOPED_ROLES, type ProjectMember } from '@/features/project-members/types'
import { cn } from '@/lib/utils'

// S3-24, US-009b (implementation_gaps.md IG-17 -- forward-pull projects/
// project_members). Versi minimal: list + tambah member (pencarian lintas
// org, S3-20) + ubah role + hapus. Dibuka lewat projectId di URL langsung
// (belum ada ProjectListPage -- pembuatan/daftar project sendiri baru S4).
function ProjectMembersPageContent() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = projectId ?? ''
  const { data, isLoading, isError } = useProjectMembers(id)
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<ProjectMember | null>(null)
  const updateRole = useUpdateProjectMemberRole(id)
  const removeMember = useRemoveProjectMember(id)

  const handleConfirmRemove = () => {
    if (!removeTarget) return
    removeMember.mutate(removeTarget.user_id, { onSuccess: () => setRemoveTarget(null) })
  }

  return (
    <div className="min-h-screen bg-bg-deep">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">Member Project</h1>
          <Button onClick={() => setAddOpen(true)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            + Tambah Member
          </Button>
        </div>

        {isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
        {isError && <p className="text-sm text-destructive">Gagal memuat daftar member project.</p>}

        {data && (
          <Card className="border-line bg-transparent shadow-none">
            <CardHeader className="border-b border-line pb-3">
              <CardTitle className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                <div className="grid grid-cols-[1.8fr_1fr_1fr_0.9fr] gap-3">
                  <span>Member</span>
                  <span>Tipe</span>
                  <span>Role</span>
                  <span>Aksi</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.length === 0 && <p className="p-4 text-sm text-text-muted">Belum ada member project.</p>}
              {data.map((member) => (
                <ProjectMemberRow
                  key={member.user_id}
                  member={member}
                  onRoleChange={(role) => updateRole.mutate({ userId: member.user_id, role })}
                  onRemove={() => setRemoveTarget(member)}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <AddMemberModal projectId={id} open={addOpen} onClose={() => setAddOpen(false)} />

      <Dialog open={removeTarget !== null} onOpenChange={(next) => !next && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keluarkan Member Project?</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-5">
            <p className="text-sm text-text-muted">
              {removeTarget?.display_name || removeTarget?.email} akan kehilangan akses ke project ini.
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

function ProjectMemberRow({
  member,
  onRoleChange,
  onRemove,
}: {
  member: ProjectMember
  onRoleChange: (role: string) => void
  onRemove: () => void
}) {
  return (
    <div className="grid grid-cols-[1.8fr_1fr_1fr_0.9fr] items-center gap-3 border-t border-line px-4 py-3">
      <div>
        <div className="text-[13px] text-text-body">{member.display_name || member.email}</div>
        <div className="mt-1 font-mono text-[8.5px] text-text-muted">{member.email}</div>
      </div>
      <span
        className={cn(
          'w-fit border px-1.5 py-0.5 font-mono text-[8.5px] uppercase',
          member.is_scoped ? 'border-amber text-amber' : 'border-line-subtle text-text-muted',
        )}
      >
        {member.is_scoped ? 'Project-Scoped' : 'Workspace Member'}
      </span>
      <select
        value={member.role}
        onChange={(e) => onRoleChange(e.target.value)}
        className="w-fit border border-line-strong bg-bg-deep px-1.5 py-0.5 font-mono text-[9px] uppercase text-text-body outline-none"
      >
        {PROJECT_SCOPED_ROLES.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
          </option>
        ))}
      </select>
      <button onClick={onRemove} className="w-fit font-mono text-[10px] text-text-muted hover:text-destructive">
        ✕ Hapus
      </button>
    </div>
  )
}

export default function ProjectMembersPage() {
  return (
    <ErrorBoundary>
      <ProjectMembersPageContent />
    </ErrorBoundary>
  )
}
