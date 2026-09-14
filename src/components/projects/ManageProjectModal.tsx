import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { useCancelInvitation, useWorkspaceMembers } from '@/features/workspace-members/hooks'
import { projectKeys, useAssignProjectPM, useDeleteProject, useRemoveProjectPM, useSetProjectArchived, useUpdateProject } from '@/features/projects/hooks'
import type { Project } from '@/features/projects/types'
import { cn } from '@/lib/utils'

// S4-04/S4-05, US-012 (AW Projects.dc.html panel "KELOLA PROJECT") -- edit
// nama, arsip/batal-arsip, dan hapus (soft-delete, konfirmasi ketik nama
// persis -- lihat ProjectRepository.SoftDelete kenapa ini bukan hapus
// permanen). Seksi PM (S4W susulan, dikonfirmasi user 2026-09-13) dipisah
// jadi bagiannya sendiri -- sama pola ManageWorkspaceModal (admin
// existing+pending ditampilkan bersama, tetap/ganti/hapus terpisah dari
// "Simpan Perubahan" nama) -- bukan lagi digabung ke satu tombol Simpan.
interface ManageProjectModalProps {
  workspaceId: string
  project: Project | null
  onClose: () => void
}

type PMMode = 'existing' | 'invite'

export default function ManageProjectModal({ workspaceId, project, onClose }: ManageProjectModalProps) {
  const [name, setName] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pmPanelOpen, setPmPanelOpen] = useState(false)
  const [pmMode, setPmMode] = useState<PMMode>('existing')
  const [pmUserId, setPmUserId] = useState('')
  const [pmEmail, setPmEmail] = useState('')
  const [pmName, setPmName] = useState('')

  const queryClient = useQueryClient()
  const members = useWorkspaceMembers(workspaceId)
  const updateProject = useUpdateProject(workspaceId)
  const assignPM = useAssignProjectPM(workspaceId)
  const removePM = useRemoveProjectPM(workspaceId)
  const cancelPMInvitation = useCancelInvitation(workspaceId)
  const setArchived = useSetProjectArchived(workspaceId)
  const deleteProject = useDeleteProject(workspaceId)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setConfirmText('')
      setError('')
      setNotice('')
      // Panel PM langsung terbuka kalau project "menunggu PM" -- AW
      // biasanya membuka Kelola justru untuk mengisinya.
      setPmPanelOpen(!project.pm_user_id)
      setPmMode('existing')
      setPmUserId('')
      setPmEmail('')
      setPmName('')
    }
  }, [project])

  if (!project) return null

  const memberCandidates = members.data ?? []
  const canDelete = confirmText.trim() === project.name
  const awaitingPM = !project.pm_user_id

  const handleSave = () => {
    setError('')
    if (!name.trim()) {
      setError('Nama project wajib diisi.')
      return
    }
    updateProject.mutate(
      { projectId: project.id, input: { name: name.trim() } },
      {
        onSuccess: () => setNotice('Perubahan tersimpan. Tercatat di audit trail.'),
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal menyimpan perubahan.'),
      },
    )
  }

  const handleAssignPM = () => {
    setError('')
    if (pmMode === 'existing') {
      if (!pmUserId) {
        setError('Pilih satu member sebagai PM.')
        return
      }
      assignPM.mutate(
        { projectId: project.id, pm: { userId: pmUserId } },
        {
          onSuccess: () => {
            setNotice('PM ditetapkan. Tercatat di audit trail.')
            setPmPanelOpen(false)
          },
          onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal menetapkan PM.'),
        },
      )
      return
    }
    if (!pmEmail.trim() || !pmName.trim()) {
      setError('Email dan nama PM wajib diisi untuk undangan baru.')
      return
    }
    assignPM.mutate(
      { projectId: project.id, pm: { email: pmEmail.trim(), name: pmName.trim() } },
      {
        onSuccess: () => {
          setNotice('Undangan PM terkirim. Project berstatus "menunggu PM" sampai diterima.')
          setPmPanelOpen(false)
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal mengundang PM.'),
      },
    )
  }

  const handleRemovePM = () => {
    setError('')
    removePM.mutate(project.id, {
      onSuccess: () => setNotice('PM dihapus. Project berstatus "menunggu PM". Tercatat di audit trail.'),
      onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal menghapus PM.'),
    })
  }

  const handleCancelPendingPM = (invitationId: string) => {
    setError('')
    cancelPMInvitation.mutate(invitationId, {
      onSuccess: () => {
        // refetch project list -- pm_pending_email dibaca dari SANA, BUKAN
        // dari query pending-invitations workspace-members yang otomatis
        // di-invalidate hook ini (pola sama IG-69: mutasi di satu folder
        // tidak otomatis tahu ada grid folder lain yang bergantung padanya).
        queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) })
        setNotice('Undangan PM dibatalkan.')
      },
      onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal membatalkan undangan.'),
    })
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
            {project.member_count} member · dibuat {new Date(project.created_at).toLocaleDateString('id-ID')}
            {project.created_by_name && ` oleh ${project.created_by_name}`} · status{' '}
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
          <Button
            onClick={handleSave}
            disabled={updateProject.isPending}
            className="w-fit font-mono text-[10px] uppercase tracking-[0.06em]"
          >
            {updateProject.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>

          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Project Manager</div>

            {awaitingPM ? (
              project.pm_pending_email ? (
                <div className="flex items-center justify-between gap-3 border border-amber/50 bg-amber/5 px-3 py-2.5">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-amber">Menunggu PM</div>
                    <div className="text-[12.5px] text-text-body">{project.pm_pending_email}</div>
                    <div className="font-mono text-[9px] text-text-muted">Undangan pending, belum diterima</div>
                  </div>
                  <Button
                    variant="outline"
                    disabled={cancelPMInvitation.isPending}
                    onClick={() => handleCancelPendingPM(project.pm_pending_invitation_id ?? '')}
                    className="w-fit shrink-0 font-mono text-[9.5px] uppercase tracking-[0.06em] text-destructive"
                  >
                    Batalkan Undangan
                  </Button>
                </div>
              ) : (
                <p className="font-mono text-[10px] text-amber">Belum ada PM -- project ini "menunggu PM".</p>
              )
            ) : (
              <div className="flex items-center justify-between gap-3 border border-line px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] text-text-body">{project.pm_name}</div>
                  <div className="truncate font-mono text-[9px] text-text-muted">{project.pm_email}</div>
                </div>
                <Button
                  variant="outline"
                  disabled={removePM.isPending}
                  onClick={handleRemovePM}
                  className="w-fit shrink-0 font-mono text-[9.5px] uppercase tracking-[0.06em] text-destructive"
                >
                  Hapus PM
                </Button>
              </div>
            )}

            {!pmPanelOpen && (
              <Button
                variant="outline"
                onClick={() => setPmPanelOpen(true)}
                className="w-fit font-mono text-[9.5px] uppercase tracking-[0.06em]"
              >
                {awaitingPM ? 'Tetapkan PM' : 'Ganti PM'}
              </Button>
            )}

            {pmPanelOpen && (
              <div className="flex flex-col gap-2.5 border border-line-strong p-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPmMode('existing')}
                    className={cn(
                      'px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em]',
                      pmMode === 'existing' ? 'bg-signal text-bg-deep' : 'border border-line-strong text-text-muted',
                    )}
                  >
                    Member Yang Ada
                  </button>
                  <button
                    type="button"
                    onClick={() => setPmMode('invite')}
                    className={cn(
                      'px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em]',
                      pmMode === 'invite' ? 'bg-signal text-bg-deep' : 'border border-line-strong text-text-muted',
                    )}
                  >
                    Undang Baru
                  </button>
                </div>

                {pmMode === 'existing' ? (
                  memberCandidates.length === 0 ? (
                    <p className="font-mono text-[10px] text-text-muted">Belum ada member di workspace ini.</p>
                  ) : (
                    <div className="flex max-h-[160px] flex-col overflow-y-auto border border-line">
                      {memberCandidates.map((m) => {
                        const active = pmUserId === m.user_id
                        return (
                          <button
                            key={m.user_id}
                            type="button"
                            onClick={() => setPmUserId(active ? '' : m.user_id)}
                            className={cn(
                              'flex items-center gap-2.5 border-t border-line-subtle px-3 py-2 text-left first:border-t-0',
                              active && 'bg-accent-wash',
                            )}
                          >
                            <span className={cn('font-mono text-[10px]', active ? 'text-signal' : 'text-text-muted')}>
                              {active ? '●' : '○'}
                            </span>
                            <span className="min-w-0 flex-1">
                              <div className={cn('truncate text-[12px]', active ? 'text-signal' : 'text-text-body')}>
                                {m.display_name}
                              </div>
                              <div className="truncate font-mono text-[8.5px] text-text-muted">
                                {m.email} · {m.role.replace(/_/g, ' ')}
                              </div>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )
                ) : (
                  <div className="flex gap-2">
                    <Input value={pmEmail} onChange={(e) => setPmEmail(e.target.value)} placeholder="pm@perusahaan.co.id" className="flex-1" />
                    <Input value={pmName} onChange={(e) => setPmName(e.target.value)} placeholder="Nama PM" className="flex-1" />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleAssignPM}
                    disabled={assignPM.isPending}
                    className="w-fit font-mono text-[9.5px] uppercase tracking-[0.06em]"
                  >
                    {assignPM.isPending ? 'Menyimpan...' : 'Simpan PM'}
                  </Button>
                  <Button variant="outline" onClick={() => setPmPanelOpen(false)} className="w-fit font-mono text-[9.5px] uppercase tracking-[0.06em]">
                    Batal
                  </Button>
                </div>
              </div>
            )}

            <p className="font-mono text-[9px] leading-relaxed text-text-faint">
              Mengganti/menghapus PM memindahkan hak kelola sprint, task, dan rule level project. Tercatat di audit
              trail.
            </p>
          </div>

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
