import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDeactivateWorkspace, useDeleteWorkspace, useReactivateWorkspace, useUpdateWorkspace } from '@/features/workspaces/hooks'
import { updateWorkspaceSchema, type UpdateWorkspaceFormValues, type Workspace } from '@/features/workspaces/types'
import { ApiError } from '@/lib/api'

interface ManageWorkspaceModalProps {
  orgId: string
  workspace: Workspace | null
  onClose: () => void
}

type ConfirmAction = 'deactivate' | 'reactivate' | 'delete' | null

const CONFIRM_COPY: Record<Exclude<ConfirmAction, null>, { title: string; body: string; confirmLabel: string }> = {
  deactivate: {
    title: 'Nonaktifkan Workspace?',
    body: 'Seluruh member workspace ini akan kehilangan akses. Data tetap tersimpan dan bisa diaktifkan kembali kapan saja.',
    confirmLabel: 'Nonaktifkan',
  },
  reactivate: {
    title: 'Aktifkan Kembali Workspace?',
    body: 'Member workspace ini akan mendapatkan akses kembali.',
    confirmLabel: 'Aktifkan',
  },
  delete: {
    title: 'Hapus Workspace Permanen?',
    body: 'Tindakan ini tidak bisa dibatalkan.',
    confirmLabel: 'Hapus Permanen',
  },
}

// S3-13, US-008 (GA Workspaces.dc.html) -- versi minimal: edit name, toggle
// aktif/nonaktif dua arah (S3-11), hapus (S3-12). TANPA pindah organisasi,
// transfer Admin Workspace (sudah ada jalur terpisah, RolePickerModal di
// WorkspaceMembersPage), status ARSIP terpisah, storage gauge, atau
// konfirmasi ketik-nama dari desain penuh -- kolom/endpoint itu belum ada
// atau sudah tercakup fitur lain.
export default function ManageWorkspaceModal({ orgId, workspace, onClose }: ManageWorkspaceModalProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const updateWorkspace = useUpdateWorkspace(orgId, workspace?.id ?? '')
  const deactivateWorkspace = useDeactivateWorkspace(orgId)
  const reactivateWorkspace = useReactivateWorkspace(orgId)
  const deleteWorkspace = useDeleteWorkspace(orgId)

  const form = useForm<UpdateWorkspaceFormValues>({
    resolver: zodResolver(updateWorkspaceSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (workspace) form.reset({ name: workspace.name })
  }, [workspace, form])

  const handleClose = () => {
    setConfirmAction(null)
    onClose()
  }

  const onSubmit = (values: UpdateWorkspaceFormValues) => {
    updateWorkspace.mutate(values)
  }

  const handleConfirm = () => {
    if (!workspace || !confirmAction) return
    if (confirmAction === 'deactivate') {
      deactivateWorkspace.mutate(workspace.id, { onSuccess: () => setConfirmAction(null) })
    } else if (confirmAction === 'reactivate') {
      reactivateWorkspace.mutate(workspace.id, { onSuccess: () => setConfirmAction(null) })
    } else {
      deleteWorkspace.mutate(workspace.id, { onSuccess: handleClose })
    }
  }

  const updateErrorMessage = updateWorkspace.error instanceof ApiError ? updateWorkspace.error.message : null
  const deleteErrorMessage = deleteWorkspace.error instanceof ApiError ? deleteWorkspace.error.message : null
  const isDeactivated = workspace?.archived_at !== null
  const confirmPending = deactivateWorkspace.isPending || reactivateWorkspace.isPending || deleteWorkspace.isPending

  return (
    <>
      <Dialog open={workspace !== null && confirmAction === null} onOpenChange={(next) => !next && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kelola Workspace</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-5 py-5">
            <div className="space-y-2">
              <Label htmlFor="edit-ws-name">Nama Workspace</Label>
              <Input id="edit-ws-name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            {updateErrorMessage && <p className="text-[11px] text-destructive">{updateErrorMessage}</p>}
            <Button
              type="submit"
              variant="outline"
              disabled={updateWorkspace.isPending}
              className="w-fit font-mono text-[10px] uppercase tracking-[0.06em]"
            >
              {updateWorkspace.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </form>

          <DialogFooter className="justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-destructive font-mono text-[10px] uppercase tracking-[0.06em] text-destructive"
              onClick={() => setConfirmAction('delete')}
            >
              Hapus
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
                Tutup
              </Button>
              <Button
                type="button"
                onClick={() => setConfirmAction(isDeactivated ? 'reactivate' : 'deactivate')}
                className="font-mono text-[10px] uppercase tracking-[0.06em]"
              >
                {isDeactivated ? 'Aktifkan' : 'Nonaktifkan'}
              </Button>
            </div>
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
                <Button
                  onClick={handleConfirm}
                  disabled={confirmPending}
                  className="font-mono text-[10px] uppercase tracking-[0.06em]"
                >
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
