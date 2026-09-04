import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useOutletContext } from 'react-router-dom'

import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOrganizationList } from '@/features/organizations/hooks'
import { useGroups } from '@/features/platform-admin/hooks'
import { useCandidateAdmins, useCreateWorkspace } from '@/features/workspaces/hooks'
import { createWorkspaceSchema, type CreateWorkspaceFormValues } from '@/features/workspaces/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const GB = 1024 * 1024 * 1024

interface CreateWorkspaceModalProps {
  open: boolean
  onClose: () => void
}

// S4G-05, Track S4G (desain "GA Add Workspace.dc.html") -- diperkaya penuh
// dari versi minimal S3-13 (dulu admin_workspace_user_id diketik manual
// sebagai UUID): sekarang picker organisasi induk LINTAS grup (workspace
// bukan lagi dibuat dari halaman per-org) + 2 tab Admin Workspace (member
// existing dari GET .../candidate-admins, atau undang email baru -- backend
// resolve otomatis kalau email itu sudah user terdaftar, S4G-05). Rate-limit
// client-side demo desain (5x/60dtk) TIDAK direplikasi -- sama keputusan
// CreateOrganizationModal (S4G-31), tidak ada padanan backend.
export default function CreateWorkspaceModal({ open, onClose }: CreateWorkspaceModalProps) {
  const outletContext = useOutletContext<GroupAdminOutletContext>()
  const isBareRender = !outletContext
  const groups = useGroups('')
  const [pickedGroupId, setPickedGroupId] = useState('')
  const groupId = isBareRender ? pickedGroupId : outletContext.groupId

  const orgList = useOrganizationList(groupId || undefined)
  const activeOrgs = orgList.data?.organizations.filter((o) => o.deactivated_at === null) ?? []

  const form = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { org_id: '', name: '', admin_mode: 'existing', admin_workspace_user_id: '', admin_email: '', admin_name: '' },
  })
  const orgId = form.watch('org_id')
  const adminMode = form.watch('admin_mode')
  const adminEmail = form.watch('admin_email')

  // Org pertama yang aktif dalam grup dipilih otomatis begitu daftar org
  // termuat -- desain tidak pernah membiarkan dropdown kosong kalau ada
  // pilihan valid.
  useEffect(() => {
    if (!orgId && activeOrgs.length > 0) form.setValue('org_id', activeOrgs[0].id, { shouldValidate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgs.length])

  const candidates = useCandidateAdmins(orgId || '')
  const createWorkspace = useCreateWorkspace(orgId || '')

  const selectedOrg = activeOrgs.find((o) => o.id === orgId) ?? null
  const remainingBytes = selectedOrg ? Math.max(0, selectedOrg.storage_quota_bytes - selectedOrg.storage_used_bytes) : 0

  const handleClose = () => {
    form.reset()
    setPickedGroupId('')
    onClose()
  }

  const onSubmit = (values: CreateWorkspaceFormValues) => {
    const body =
      values.admin_mode === 'existing'
        ? { name: values.name, admin_workspace_user_id: values.admin_workspace_user_id }
        : { name: values.name, admin_workspace_email: values.admin_email, admin_workspace_name: values.admin_name }
    createWorkspace.mutate(body, { onSuccess: handleClose })
  }

  const errorMessage = createWorkspace.error instanceof ApiError ? createWorkspace.error.message : null
  const knownEmail = candidates.data?.find((c) => c.email.toLowerCase() === (adminEmail ?? '').trim().toLowerCase())

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Tambah Workspace Baru</DialogTitle>
          <p className="mt-1.5 text-sm text-text-muted">
            Workspace adalah wadah project di bawah satu organisasi. Group Admin membuat wadahnya; pengelolaan isinya —
            member, custom status, rule automation — dijalankan Admin Workspace yang ditunjuk di sini.
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col">
          <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-5">
            {isBareRender && (
              <div className="space-y-2">
                <Label htmlFor="group_id">Grup</Label>
                <select
                  id="group_id"
                  value={pickedGroupId}
                  onChange={(e) => {
                    setPickedGroupId(e.target.value)
                    form.setValue('org_id', '', { shouldValidate: false })
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">{groups.isLoading ? 'Memuat grup...' : 'Pilih grup...'}</option>
                  {groups.data?.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.tier})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="org_id">Organisasi Induk</Label>
              <select
                id="org_id"
                {...form.register('org_id')}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">{orgList.isLoading ? 'Memuat organisasi...' : 'Pilih organisasi...'}</option>
                {activeOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              {selectedOrg && (
                <p className="font-mono text-[9px] text-text-muted">
                  {(remainingBytes / GB).toFixed(1)} GB sisa dari {(selectedOrg.storage_quota_bytes / GB).toFixed(0)} GB kuota{' '}
                  {selectedOrg.name} — storage workspace dihitung pada kuota organisasi induk, bukan kuota terpisah.
                </p>
              )}
              {form.formState.errors.org_id && (
                <p className="text-[11px] text-destructive">{form.formState.errors.org_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama Workspace</Label>
              <Input id="name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="border-t border-line pt-3">
              <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
                Admin Workspace Penanggung Jawab · Wajib
              </p>
              <p className="mb-3 text-[11px] text-text-muted">
                Setiap workspace wajib punya satu Admin Workspace sejak dibuat. Pilih member yang sudah ada di organisasi
                ini, atau undang orang baru — undangan berlaku 72 jam dan penerima membuat password sendiri.
              </p>

              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => form.setValue('admin_mode', 'existing', { shouldValidate: false })}
                  className={cn(
                    'px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em]',
                    adminMode === 'existing' ? 'bg-signal text-bg-deep' : 'border border-line-strong text-text-muted',
                  )}
                >
                  Member Yang Ada
                </button>
                <button
                  type="button"
                  onClick={() => form.setValue('admin_mode', 'invite', { shouldValidate: false })}
                  className={cn(
                    'px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em]',
                    adminMode === 'invite' ? 'bg-signal text-bg-deep' : 'border border-line-strong text-text-muted',
                  )}
                >
                  Undang Baru
                </button>
              </div>

              {adminMode === 'existing' ? (
                <div className="space-y-2">
                  {candidates.isLoading && <p className="text-[11px] text-text-muted">Memuat member...</p>}
                  {!candidates.isLoading && (candidates.data?.length ?? 0) === 0 && (
                    <p className="border border-dashed border-line-strong p-3 text-[11px] text-text-muted">
                      Belum ada member aktif di organisasi ini. Gunakan tab Undang Baru untuk menunjuk Admin Workspace
                      lewat email.
                    </p>
                  )}
                  {(candidates.data?.length ?? 0) > 0 && (
                    <div className="divide-y divide-line border border-line">
                      {candidates.data!.map((c) => (
                        <button
                          key={c.user_id}
                          type="button"
                          onClick={() =>
                            form.setValue('admin_workspace_user_id', form.watch('admin_workspace_user_id') === c.user_id ? '' : c.user_id, {
                              shouldValidate: false,
                            })
                          }
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2.5 text-left',
                            form.watch('admin_workspace_user_id') === c.user_id && 'bg-accent-wash',
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] text-text-body">{c.display_name}</div>
                            <div className="font-mono text-[10px] text-text-muted">{c.email}</div>
                          </div>
                          {form.watch('admin_workspace_user_id') === c.user_id && (
                            <span className="font-mono text-[9px] text-signal">● DITUNJUK</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {form.formState.errors.admin_workspace_user_id && (
                    <p className="text-[11px] text-destructive">{form.formState.errors.admin_workspace_user_id.message}</p>
                  )}
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Input placeholder="admin@perusahaan.co.id" {...form.register('admin_email')} />
                    {form.formState.errors.admin_email && (
                      <p className="text-[11px] text-destructive">{form.formState.errors.admin_email.message}</p>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Nama admin"
                      readOnly={!!knownEmail}
                      value={knownEmail ? knownEmail.display_name : form.watch('admin_name')}
                      onChange={(e) => form.setValue('admin_name', e.target.value, { shouldValidate: false })}
                      className={knownEmail ? 'bg-muted' : undefined}
                    />
                  </div>
                </div>
              )}
              {adminMode === 'invite' && (
                <p className="mt-2 font-mono text-[9px] text-text-muted">
                  {knownEmail
                    ? `✓ Akun sudah terdaftar sebagai ${knownEmail.display_name} — langsung ditetapkan tanpa email registrasi ulang.`
                    : 'Akun belum terdaftar — sistem mengirim email undangan; penerima membuat password sendiri.'}
                </p>
              )}
            </div>

            {errorMessage && <p className="text-[11px] text-destructive">{errorMessage}</p>}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={createWorkspace.isPending || !orgId}
              className="font-mono text-[10px] uppercase tracking-[0.06em]"
            >
              {createWorkspace.isPending ? 'Membuat...' : 'Buat Workspace'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
              Tutup
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
