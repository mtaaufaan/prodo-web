import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateOrganization } from '@/features/organizations/hooks'
import { createOrganizationSchema, type CreateOrganizationFormValues } from '@/features/organizations/types'
import { useGroups } from '@/features/platform-admin/hooks'
import { ApiError } from '@/lib/api'

interface CreateOrganizationModalProps {
  open: boolean
  onClose: () => void
}

// S3-07, US-007 (GA Add Organization.dc.html) -- versi minimal: name/slug/
// group_id saja, TANPA domain/logo/quota/retention/language dari desain
// penuh (kolom-kolom itu belum ada di DATABASE_SCHEMA.md §5.7). group_id
// dipilih dari dropdown direktori grup (S4P-36, menutup
// implementation_gaps.md IG-16) -- GET /platform/groups otomatis
// ter-scope ke grup milik sendiri untuk GA, semua grup untuk PA.
export default function CreateOrganizationModal({ open, onClose }: CreateOrganizationModalProps) {
  const createOrganization = useCreateOrganization()
  const groups = useGroups('')
  const form = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { group_id: '', name: '', slug: '' },
  })

  const handleClose = () => {
    form.reset()
    onClose()
  }

  const onSubmit = (values: CreateOrganizationFormValues) => {
    createOrganization.mutate(values, { onSuccess: handleClose })
  }

  const errorMessage = createOrganization.error instanceof ApiError ? createOrganization.error.message : null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat Organisasi</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-5 py-5">
          <div className="space-y-2">
            <Label htmlFor="group_id">Grup Pemilik</Label>
            <select
              id="group_id"
              {...form.register('group_id')}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">{groups.isLoading ? 'Memuat grup...' : 'Pilih grup...'}</option>
              {groups.data?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.tier})
                </option>
              ))}
            </select>
            {groups.isError && <p className="text-[11px] text-destructive">Gagal memuat daftar grup.</p>}
            {form.formState.errors.group_id && (
              <p className="text-[11px] text-destructive">{form.formState.errors.group_id.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nama Organisasi</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" placeholder="acme-corp" {...form.register('slug')} />
            {form.formState.errors.slug && (
              <p className="text-[11px] text-destructive">{form.formState.errors.slug.message}</p>
            )}
          </div>
          {errorMessage && <p className="text-[11px] text-destructive">{errorMessage}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createOrganization.isPending}
              className="font-mono text-[10px] uppercase tracking-[0.06em]"
            >
              {createOrganization.isPending ? 'Membuat...' : 'Buat Organisasi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
