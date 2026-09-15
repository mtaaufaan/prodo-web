import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { useCancelInvitation } from '@/features/workspace-members/hooks'
import { projectKeys, useAssignProjectPM, useDeleteProject, useRemoveProjectPM, useSetProjectArchived, useUpdateProject } from '@/features/projects/hooks'
import type { Project } from '@/features/projects/types'

// S4-04/S4-05, US-012 (AW Projects.dc.html panel "KELOLA PROJECT") -- edit
// nama, arsip/batal-arsip, dan hapus (soft-delete, konfirmasi ketik nama
// persis -- lihat ProjectRepository.SoftDelete kenapa ini bukan hapus
// permanen). Seksi PM (S4W susulan, dikonfirmasi user 2026-09-13) dipisah
// jadi bagiannya sendiri -- sama pola ManageWorkspaceModal (admin
// existing+pending ditampilkan bersama, tetap/ganti/hapus terpisah dari
// "Simpan Perubahan" nama) -- bukan lagi digabung ke satu tombol Simpan.
// Diselaraskan 2026-09-14 (dikonfirmasi user "dibuat seperti Kelola
// Workspace bagian Admin Workspace") ke pola grid+input-selalu-terbuka
// ManageWorkspaceModal -- toggle "Member Yang Ada"/"Undang Baru" DIHAPUS,
// satu field email (+ nama opsional untuk email belum terdaftar) yang
// selalu terlihat, sama seperti "+ Tambah Admin". Email yang SUDAH
// terdaftar (member workspace ini ATAU user lain mana pun) langsung
// resolve lewat jalur pmEmail existing-user backend (ProjectService.
// resolvePM) -- pmUserId/member-picker tidak lagi dipakai FE, backend
// tetap mendukungnya (dipakai AddProjectModal, di luar cakupan perubahan
// ini).
interface ManageProjectModalProps {
  workspaceId: string
  project: Project | null
  onClose: () => void
}

export default function ManageProjectModal({ workspaceId, project, onClose }: ManageProjectModalProps) {
  const [name, setName] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pmEmail, setPmEmail] = useState('')
  const [pmName, setPmName] = useState('')
  const prevProjectIdRef = useRef<string | null>(null)

  const queryClient = useQueryClient()
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
      // notice HANYA direset saat ganti project (bukan setiap refetch) --
      // ditemukan user 2026-09-15 ("kenapa di kelola project tidak
      // dikerjakan juga"): tanpa guard ini, invalidateQueries setelah
      // Simpan Perubahan berhasil memicu efek ini lagi (objek project baru
      // dari .find(), walau ID sama) dan langsung menghapus notice yang
      // baru saja di-set handleSave -- notice hijau tidak pernah sempat
      // terlihat. Sama fix race condition seperti ManageOrganizationModal/
      // ManageWorkspaceModal/ManageMemberModal/ManageMemberPanel.
      if (prevProjectIdRef.current !== project.id) setNotice('')
      prevProjectIdRef.current = project.id
      setPmEmail('')
      setPmName('')
    } else {
      prevProjectIdRef.current = null
    }
  }, [project])

  if (!project) return null

  const canDelete = confirmText.trim() === project.name
  // dirty (susulan 2026-09-15, ditemukan user: "kenapa di kelola project
  // tidak dikerjakan juga" -- pola yang sama dengan ManageMemberPanel)
  // -- modal ini SUDAH punya notice hijau "tersimpan" tapi tidak pernah
  // punya peringatan "belum disimpan" untuk field Nama Project, beda dari
  // standar ManageWorkspaceModal/ManageOrganizationModal/ManageMemberModal
  // GA. Cuma field Nama yang punya draft+tombol Simpan terpisah (section
  // PM di bawah semuanya aksi langsung dengan tombolnya sendiri, sama
  // pola "Tambah Admin" ManageWorkspaceModal -- tidak butuh dirty check).
  const dirty = name.trim() !== project.name

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
    if (!pmEmail.trim()) {
      setError('Email PM wajib diisi.')
      return
    }
    assignPM.mutate(
      { projectId: project.id, pm: { email: pmEmail.trim(), name: pmName.trim() } },
      {
        onSuccess: () => {
          setNotice('PM diperbarui. Tercatat di audit trail.')
          setPmEmail('')
          setPmName('')
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal menetapkan PM.'),
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
      <DialogContent className="max-w-[600px]">
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

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          {!dirty && notice && (
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
          {dirty && (
            <p className="border border-amber p-2 font-mono text-[10px] leading-relaxed text-amber">
              Ada perubahan yang belum disimpan. Tekan &quot;Simpan Perubahan&quot; untuk menerapkan.
            </p>
          )}
          <Button
            onClick={handleSave}
            disabled={updateProject.isPending}
            className="w-fit font-mono text-[10px] uppercase tracking-[0.06em]"
          >
            {updateProject.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>

          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Project Manager</div>

            <div className="border border-line">
              <div className="grid grid-cols-[1.2fr_1.5fr_1fr_0.6fr] gap-2 border-b border-line bg-raised-2 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.08em] text-text-dim">
                <span>Nama</span>
                <span>Email</span>
                <span>Status</span>
                <span>Aksi</span>
              </div>
              {project.pm_user_id ? (
                <div className="grid grid-cols-[1.2fr_1.5fr_1fr_0.6fr] items-center gap-2 border-t border-line px-3 py-2 text-[12px]">
                  <span className="truncate">{project.pm_name}</span>
                  <span className="truncate font-mono text-[10.5px] text-text-muted">{project.pm_email}</span>
                  <span className="font-mono text-[10px] text-mint">Aktif</span>
                  <button
                    type="button"
                    disabled={removePM.isPending}
                    onClick={handleRemovePM}
                    className="w-fit font-mono text-[10px] text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                  >
                    Cabut
                  </button>
                </div>
              ) : project.pm_pending_email ? (
                <div className="grid grid-cols-[1.2fr_1.5fr_1fr_0.6fr] items-center gap-2 border-t border-line px-3 py-2 text-[12px]">
                  <span className="text-text-dim">—</span>
                  <span className="truncate font-mono text-[10.5px] text-text-muted">{project.pm_pending_email}</span>
                  <span className="font-mono text-[10px] text-amber">Menunggu Diterima</span>
                  <button
                    type="button"
                    disabled={cancelPMInvitation.isPending}
                    onClick={() => handleCancelPendingPM(project.pm_pending_invitation_id ?? '')}
                    className="w-fit font-mono text-[10px] text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                  >
                    Cabut
                  </button>
                </div>
              ) : (
                <p className="border-t border-line px-3 py-3 text-[11px] text-text-muted">Belum ada Project Manager.</p>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={pmEmail}
                onChange={(e) => {
                  setPmEmail(e.target.value)
                  setError('')
                }}
                placeholder="email@perusahaan.co.id"
                className="flex-1"
              />
              <Input
                value={pmName}
                onChange={(e) => {
                  setPmName(e.target.value)
                  setError('')
                }}
                placeholder="Nama (kalau belum terdaftar)"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!pmEmail.trim() || assignPM.isPending}
                onClick={handleAssignPM}
                className="flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.06em]"
              >
                {assignPM.isPending ? 'Menyimpan...' : '+ Tetapkan PM'}
              </Button>
            </div>

            <p className="font-mono text-[9px] leading-relaxed text-text-faint">
              Email yang sudah terdaftar (member workspace ini atau user lain) langsung ditetapkan sebagai PM; yang
              belum terdaftar diundang (isi Nama supaya tersimpan di form aktivasinya). Mengganti/menghapus PM
              memindahkan hak kelola sprint, task, dan rule level project. Tercatat di audit trail.
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
