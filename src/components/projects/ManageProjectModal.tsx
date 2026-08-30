import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { useWorkspaceMembers } from '@/features/workspace-members/hooks'
import { useDeleteProject, useSetProjectArchived, useUpdateProject } from '@/features/projects/hooks'
import type { Project } from '@/features/projects/types'
import { cn } from '@/lib/utils'

// S4-04/S4-05, US-012 (AW Projects.dc.html panel "KELOLA PROJECT") -- edit
// nama/PM, arsip/batal-arsip, dan hapus (soft-delete, konfirmasi ketik nama
// persis -- lihat ProjectRepository.SoftDelete kenapa ini bukan hapus
// permanen).
interface ManageProjectModalProps {
  workspaceId: string
  project: Project | null
  onClose: () => void
}

export default function ManageProjectModal({ workspaceId, project, onClose }: ManageProjectModalProps) {
  const [name, setName] = useState('')
  const [pmUserId, setPmUserId] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const members = useWorkspaceMembers(workspaceId)
  const updateProject = useUpdateProject(workspaceId)
  const setArchived = useSetProjectArchived(workspaceId)
  const deleteProject = useDeleteProject(workspaceId)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setPmUserId(project.pm_user_id ?? '')
      setConfirmText('')
      setError('')
      setNotice('')
    }
  }, [project])

  if (!project) return null

  const pmCandidates = (members.data ?? []).filter((m) => m.role === 'project_manager')
  const canDelete = confirmText.trim() === project.name

  const handleSave = () => {
    setError('')
    if (!name.trim()) {
      setError('Nama project wajib diisi.')
      return
    }
    updateProject.mutate(
      { projectId: project.id, input: { name: name.trim(), pm_user_id: pmUserId !== project.pm_user_id ? pmUserId : undefined } },
      {
        onSuccess: () => setNotice('Perubahan tersimpan. Tercatat di audit trail.'),
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal menyimpan perubahan.'),
      },
    )
  }

  const handleToggleArchive = () => {
    setError('')
    setArchived.mutate(
      { projectId: project.id, archive: !project.is_archived },
      {
        onSuccess: () =>
          setNotice(
            project.is_archived
              ? 'Project diaktifkan kembali.'
              : 'Project diarsipkan -- baca saja untuk member. Tercatat di audit trail.',
          ),
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal mengubah status arsip.'),
      },
    )
  }

  const handleDelete = () => {
    if (!canDelete) return
    deleteProject.mutate(project.id, { onSuccess: onClose, onError: () => setError('Gagal menghapus project.') })
  }

  return (
    <Dialog open={Boolean(project)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {project.code} · {project.name}
          </DialogTitle>
          <div className="mt-1.5 font-mono text-[10.5px] text-text-muted">
            {project.member_count} member · dibuat {new Date(project.created_at).toLocaleDateString('id-ID')} · status{' '}
            {project.is_archived ? 'ARSIP' : 'AKTIF'}
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-5">
          {notice && (
            <div className="border border-mint px-3.5 py-3 font-mono text-[10px] leading-relaxed text-mint">✓ {notice}</div>
          )}
          {error && (
            <div className="border border-destructive px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">
              ⚠ {error}
            </div>
          )}

          <div>
            <Label htmlFor="manage-project-name" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              Nama Project
            </Label>
            <Input id="manage-project-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              Project Manager Penanggung Jawab
            </Label>
            <div className="flex flex-col border border-line">
              {pmCandidates.map((m) => {
                const active = pmUserId === m.user_id
                return (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => setPmUserId(m.user_id)}
                    className={cn(
                      'flex items-center gap-2.5 border-t border-line-subtle px-3 py-2.5 text-left first:border-t-0',
                      active && 'bg-accent-wash',
                    )}
                  >
                    <span className={cn('font-mono text-[11px]', active ? 'text-signal' : 'text-text-muted')}>
                      {active ? '●' : '○'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className={cn('truncate text-[12.5px]', active ? 'text-signal' : 'text-text-body')}>{m.display_name}</div>
                      <div className="truncate font-mono text-[9px] text-text-muted">{m.email}</div>
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="mt-1.5 font-mono text-[9px] leading-relaxed text-text-faint">
              Mengalihkan PM memindahkan hak kelola sprint, task, dan rule level project. Tercatat di audit trail.
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={updateProject.isPending}
            className="w-fit font-mono text-[10px] uppercase tracking-[0.06em]"
          >
            {updateProject.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>

          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Arsip Project</div>
            <Button
              variant="outline"
              onClick={handleToggleArchive}
              disabled={setArchived.isPending}
              className="w-fit font-mono text-[10px] uppercase tracking-[0.06em] text-amber"
            >
              {project.is_archived ? 'Aktifkan Kembali' : 'Arsipkan Project'}
            </Button>
            <p className="font-mono text-[9px] leading-relaxed text-text-faint">
              Project arsip menjadi baca saja untuk member; dapat diaktifkan kembali kapan saja.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-destructive">Hapus Project</div>
            <p className="font-mono text-[9.5px] leading-relaxed text-text-muted">
              Project akan dipindahkan ke jadwal penghapusan (soft-delete) sesuai kebijakan retensi organisasi --
              masih dapat dipulihkan Group Admin selama masa retensi berjalan. Ketik nama project untuk konfirmasi.
            </p>
            <div className="flex gap-2.5">
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={project.name} className="flex-1" />
              <Button variant="destructive" disabled={!canDelete || deleteProject.isPending} onClick={handleDelete}>
                Hapus Project
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
