import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateWorkspace } from '@/features/workspaces/hooks'
import { createWorkspaceSchema, type CreateWorkspaceFormValues } from '@/features/workspaces/types'
import { ApiError } from '@/lib/api'

interface CreateWorkspaceModalProps {
  orgId: string
  open: boolean
  onClose: () => void
}

// S3-13, US-008 (GA Add Workspace.dc.html) -- versi minimal: name +
// admin_workspace_user_id saja. TANPA picker member organisasi/mode undang
// email baru dari desain penuh (butuh endpoint cari member lintas-workspace
// yang belum ada) -- admin_workspace_user_id diketik manual (UUID), sama
// pola group_id di CreateOrganizationModal.
export default function CreateWorkspaceModal({ orgId, open, onClose }: CreateWorkspaceModalProps) {
  const createWorkspace = useCreateWorkspace(orgId)
  const form = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: '', admin_workspace_user_id: '' },
  })

  const handleClose = () => {
    form.reset()
    onClose()
  }

  const onSubmit = (values: CreateWorkspaceFormValues) => {
    createWorkspace.mutate(values, { onSuccess: handleClose })
  }

  const errorMessage = createWorkspace.error instanceof ApiError ? createWorkspace.error.message : null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat Workspace</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-5 py-5">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Nama Workspace</Label>
            <Input id="ws-name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-admin">Admin Workspace User ID</Label>
            <Input id="ws-admin" placeholder="UUID member penanggung jawab" {...form.register('admin_workspace_user_id')} />
            {form.formState.errors.admin_workspace_user_id && (
              <p className="text-[11px] text-destructive">{form.formState.errors.admin_workspace_user_id.message}</p>
            )}
          </div>
          {errorMessage && <p className="text-[11px] text-destructive">{errorMessage}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createWorkspace.isPending}
              className="font-mono text-[10px] uppercase tracking-[0.06em]"
            >
              {createWorkspace.isPending ? 'Membuat...' : 'Buat Workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
