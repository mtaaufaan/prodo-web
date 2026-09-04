import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOrganizationList } from '@/features/organizations/hooks'
import { useGroups } from '@/features/platform-admin/hooks'
import {
  useArchiveWorkspace,
  useCandidateAdmins,
  useDeactivateWorkspace,
  useDeleteWorkspace,
  useMoveWorkspace,
  useReactivateWorkspace,
  useReassignWorkspaceAdmin,
  useUnarchiveWorkspace,
  useUpdateWorkspace,
} from '@/features/workspaces/hooks'
import type { WorkspaceListRow } from '@/features/workspaces/types'
import { ApiError } from '@/lib/api'

const GB = 1024 * 1024 * 1024

interface ManageWorkspaceModalProps {
  workspace: WorkspaceListRow | null
  onClose: () => void
}

type ConfirmAction = 'archive' | 'unarchive' | 'deactivate' | 'reactivate' | 'delete' | null

const CONFIRM_COPY: Record<Exclude<ConfirmAction, null>, { title: string; body: string; confirmLabel: string }> = {
  archive: {
    title: 'Arsipkan Workspace?',
    body: 'Workspace jadi baca saja — project dan task tetap dapat dibuka member, storage tetap dihitung pada kuota organisasi.',
    confirmLabel: 'Arsipkan',
  },
  unarchive: {
    title: 'Batalkan Arsip Workspace?',
    body: 'Workspace kembali dapat diedit oleh member seperti biasa.',
    confirmLabel: 'Batalkan Arsip',
  },
  deactivate: {
    title: 'Nonaktifkan Akses Workspace?',
    body: 'Akses seluruh member — termasuk Admin Workspace — diblokir seketika. Data tidak dihapus, tapi tidak ada satu pun member yang dapat masuk sampai akses dipulihkan.',
    confirmLabel: 'Nonaktifkan',
  },
  reactivate: {
    title: 'Aktifkan Kembali Akses Workspace?',
    body: 'Akses workspace dipulihkan untuk seluruh member.',
    confirmLabel: 'Aktifkan',
  },
  delete: {
    title: 'Hapus Workspace Permanen?',
    body: 'Tindakan ini tidak bisa dibatalkan. Seluruh project dan task workspace ini ikut terhapus.',
    confirmLabel: 'Hapus Permanen',
  },
}

// S4G-05, Track S4G (desain "GA Workspaces.dc.html") -- diperkaya penuh dari
// versi minimal S3-13: pindah organisasi (dengan warning kalau storage tidak
// muat di kuota tujuan), ganti Admin Workspace (dropdown candidate-admins
// dari organisasi TARGET -- ikut berubah kalau org dipindah dalam form yang
// sama), status ARSIP terpisah dari NONAKTIF (S4G-04 sudah membedakan
// kolomnya, versi minimal S3-13 dulu masih pakai archived_at untuk kedua
// arti), konfirmasi ketik-nama untuk hapus. Step-up auth (OTP) untuk
// Nonaktifkan/Hapus SENGAJA TIDAK dibangun -- gap lintas-fitur yang sudah
// tercatat terbuka (design_gaps.md DG-10), ManageOrganizationModal yang
// sudah ship juga belum punya ini, konsisten confirm dialog biasa dulu.
export default function ManageWorkspaceModal({ workspace, onClose }: ManageWorkspaceModalProps) {
  const outletContext = useOutletContext<GroupAdminOutletContext>()
  const isBareRender = !outletContext
  const groups = useGroups('')
  const [pickedGroupId, setPickedGroupId] = useState('')
  const groupId = isBareRender ? pickedGroupId : outletContext.groupId

  const orgList = useOrganizationList(groupId || undefined)
  const activeOrgs = orgList.data?.organizations.filter((o) => o.deactivated_at === null || o.id === workspace?.org_id) ?? []

  const [name, setName] = useState('')
  const [targetOrgId, setTargetOrgId] = useState('')
  const [adminUserId, setAdminUserId] = useState('')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    if (workspace) {
      setName(workspace.name)
      setTargetOrgId(workspace.org_id)
      setAdminUserId('')
      setDeleteConfirmText('')
      setConfirmAction(null)
    }
  }, [workspace])

  const candidates = useCandidateAdmins(targetOrgId || '')
  const updateWorkspace = useUpdateWorkspace(workspace?.id ?? '')
  const moveWorkspace = useMoveWorkspace(workspace?.id ?? '')
  const reassignAdmin = useReassignWorkspaceAdmin(workspace?.id ?? '')
  const archiveWorkspace = useArchiveWorkspace()
  const unarchiveWorkspace = useUnarchiveWorkspace()
  const deactivateWorkspace = useDeactivateWorkspace()
  const reactivateWorkspace = useReactivateWorkspace()
  const deleteWorkspace = useDeleteWorkspace()

  const handleClose = () => {
    setConfirmAction(null)
    onClose()
  }

  const targetOrg = activeOrgs.find((o) => o.id === targetOrgId) ?? null
  const currentOrg = activeOrgs.find((o) => o.id === workspace?.org_id) ?? null
  const moving = !!workspace && targetOrgId !== workspace.org_id
  const targetRemainingBytes = targetOrg ? Math.max(0, targetOrg.storage_quota_bytes - targetOrg.storage_used_bytes) : 0
  const overflow = moving && !!workspace && workspace.storage_used_bytes > targetRemainingBytes
  const nameEmpty = name.trim() === ''

  const saving = updateWorkspace.isPending || moveWorkspace.isPending || reassignAdmin.isPending
  const saveError = [updateWorkspace.error, moveWorkspace.error, reassignAdmin.error].find((e) => e instanceof ApiError) as
    | ApiError
    | undefined

  const handleSave = async () => {
    if (!workspace || nameEmpty || overflow) return
    if (name.trim() !== workspace.name) await updateWorkspace.mutateAsync(name.trim())
    if (moving) await moveWorkspace.mutateAsync(targetOrgId)
    if (adminUserId && adminUserId !== '') await reassignAdmin.mutateAsync({ admin_workspace_user_id: adminUserId })
  }

  const handleConfirm = () => {
    if (!workspace || !confirmAction) return
    const done = () => setConfirmAction(null)
    switch (confirmAction) {
      case 'archive':
        archiveWorkspace.mutate(workspace.id, { onSuccess: done })
        break
      case 'unarchive':
        unarchiveWorkspace.mutate(workspace.id, { onSuccess: done })
        break
      case 'deactivate':
        deactivateWorkspace.mutate(workspace.id, { onSuccess: done })
        break
      case 'reactivate':
        reactivateWorkspace.mutate(workspace.id, { onSuccess: done })
        break
      case 'delete':
        deleteWorkspace.mutate(workspace.id, { onSuccess: handleClose })
        break
    }
  }

  const deleteErrorMessage = deleteWorkspace.error instanceof ApiError ? deleteWorkspace.error.message : null
  const confirmPending =
    archiveWorkspace.isPending ||
    unarchiveWorkspace.isPending ||
    deactivateWorkspace.isPending ||
    reactivateWorkspace.isPending ||
    deleteWorkspace.isPending
  const isArchived = workspace?.archived_at !== null
  const isDeactivated = workspace?.deactivated_at !== null
  const deleteMatches = workspace !== null && deleteConfirmText === workspace.name

  return (
    <>
      <Dialog open={workspace !== null && confirmAction === null} onOpenChange={(next) => !next && handleClose()}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Kelola Workspace</DialogTitle>
            {workspace && (
              <p className="mt-1 font-mono text-[10px] text-text-muted">
                {workspace.org_name} · dibuat {new Date(workspace.created_at).toLocaleDateString('id-ID')} · storage{' '}
                {(workspace.storage_used_bytes / GB).toFixed(1)} GB
              </p>
            )}
          </DialogHeader>

          <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-5">
            {isBareRender && (
              <div className="space-y-2">
                <Label htmlFor="mw-group">Grup (untuk daftar organisasi tujuan)</Label>
                <select
                  id="mw-group"
                  value={pickedGroupId}
                  onChange={(e) => setPickedGroupId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">{groups.isLoading ? 'Memuat grup...' : 'Pilih grup...'}</option>
                  {groups.data?.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="mw-name">Nama Workspace</Label>
                <Input id="mw-name" value={name} onChange={(e) => setName(e.target.value)} />
                {nameEmpty && <p className="text-[11px] text-destructive">Nama workspace wajib diisi.</p>}
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="mw-org">Organisasi Induk</Label>
                <select
                  id="mw-org"
                  value={targetOrgId}
                  onChange={(e) => {
                    setTargetOrgId(e.target.value)
                    setAdminUserId('')
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {currentOrg === null && workspace && <option value={workspace.org_id}>{workspace.org_name}</option>}
                  {activeOrgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <p className={overflow ? 'text-[10px] text-destructive' : 'text-[10px] text-text-muted'}>
                  {moving
                    ? overflow
                      ? `⚠ Storage ${(workspace!.storage_used_bytes / GB).toFixed(1)} GB tidak muat di ${targetOrg?.name} (sisa ${(targetRemainingBytes / GB).toFixed(1)} GB).`
                      : `Storage ${(workspace!.storage_used_bytes / GB).toFixed(1)} GB ikut berpindah, dihitung pada kuota ${targetOrg?.name}.`
                    : 'Memindahkan workspace juga memindahkan storage-nya ke kuota organisasi tujuan.'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mw-admin">Admin Workspace Penanggung Jawab</Label>
              <select
                id="mw-admin"
                value={adminUserId}
                onChange={(e) => setAdminUserId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">
                  {workspace?.admin_name
                    ? `${workspace.admin_name} (tidak diubah)`
                    : workspace?.pending_admin_email
                      ? `Undangan pending · ${workspace.pending_admin_email} (tidak diubah)`
                      : 'Pilih Admin Workspace...'}
                </option>
                {candidates.data?.map((c) => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.display_name} ({c.email})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-text-muted">
                Wajib terisi — workspace tidak boleh tanpa Admin Workspace. Pengalihan menurunkan admin lama ke role editor
                dan mengirim notifikasi ke admin lama+baru.
              </p>
              {!workspace?.admin_name && workspace?.pending_admin_email && (
                <p className="text-[10px] text-amber">
                  ⚠ Undangan ke {workspace.pending_admin_email} belum diterima — belum tercatat sebagai member workspace ini.
                  Pilih member lain di sini untuk menggantikannya sekarang, atau tunggu sampai undangan diterima
                  (berlaku 72 jam sejak workspace dibuat).
                </p>
              )}
            </div>

            {saveError && <p className="text-[11px] text-destructive">{saveError.message}</p>}

            <Button
              type="button"
              variant="outline"
              disabled={saving || nameEmpty || overflow}
              onClick={handleSave}
              className="w-fit font-mono text-[10px] uppercase tracking-[0.06em]"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>

            <div className="border-t border-line pt-4">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Status &amp; Siklus Hidup</p>
              <p className="mb-2 text-[11px] text-text-muted">
                ARSIP — workspace jadi baca saja; project dan task tetap dapat dibuka, storage tetap dihitung pada kuota
                organisasi. NONAKTIF — akses seluruh member ke workspace diblokir; data tidak dihapus.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmAction(isArchived ? 'unarchive' : 'archive')}
                  className="font-mono text-[10px] uppercase tracking-[0.06em]"
                >
                  {isArchived ? 'Aktifkan Kembali Dari Arsip' : 'Arsipkan Workspace'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setConfirmAction(isDeactivated ? 'reactivate' : 'deactivate')}
                  className="font-mono text-[10px] uppercase tracking-[0.06em]"
                >
                  {isDeactivated ? 'Aktifkan Kembali' : 'Nonaktifkan Akses'}
                </Button>
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-destructive">Hapus Workspace</p>
              <p className="mb-2 text-[11px] text-text-muted">
                Penghapusan bersifat permanen. Ketik <span className="font-mono text-text-body">{workspace?.name}</span> untuk
                konfirmasi.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={workspace?.name}
                  className="w-48"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!deleteMatches}
                  onClick={() => setConfirmAction('delete')}
                  className="border-destructive font-mono text-[10px] uppercase tracking-[0.06em] text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hapus Workspace
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction !== null} onOpenChange={(next) => !next && setConfirmAction(null)}>
        <DialogContent>
          {confirmAction && (
            <>
              <DialogHeader>
                <DialogTitle>{CONFIRM_COPY[confirmAction].title}</DialogTitle>
              </DialogHeader>
              <div className="px-5 py-5">
                <p className="text-sm text-text-muted">{CONFIRM_COPY[confirmAction].body}</p>
                {confirmAction === 'delete' && deleteErrorMessage && (
                  <p className="mt-2 text-[11px] text-destructive">{deleteErrorMessage}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmAction(null)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
                  Batal
                </Button>
                <Button onClick={handleConfirm} disabled={confirmPending} className="font-mono text-[10px] uppercase tracking-[0.06em]">
                  {confirmPending ? 'Memproses...' : CONFIRM_COPY[confirmAction].confirmLabel}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
