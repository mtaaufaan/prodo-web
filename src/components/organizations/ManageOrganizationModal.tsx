import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useDeactivateOrganization,
  useDeleteOrganization,
  useOrganizationSummary,
  useReactivateOrganization,
  useUpdateOrganization,
  useUpdateOrganizationSettings,
  useUpdateOrganizationStorageQuota,
} from '@/features/organizations/hooks'
import { updateOrganizationSchema, type Organization, type UpdateOrganizationFormValues } from '@/features/organizations/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const GB = 1024 * 1024 * 1024

interface ManageOrganizationModalProps {
  organization: Organization | null
  onClose: () => void
}

type ConfirmAction = 'deactivate' | 'reactivate' | 'delete' | null

const CONFIRM_COPY: Record<Exclude<ConfirmAction, null>, { title: string; body: string; confirmLabel: string }> = {
  deactivate: {
    title: 'Nonaktifkan Organisasi?',
    body: 'Seluruh member organisasi ini akan kehilangan akses. Data tetap tersimpan dan bisa diaktifkan kembali kapan saja.',
    confirmLabel: 'Nonaktifkan',
  },
  reactivate: {
    title: 'Aktifkan Kembali Organisasi?',
    body: 'Member organisasi ini akan mendapatkan akses kembali.',
    confirmLabel: 'Aktifkan',
  },
  delete: {
    title: 'Hapus Organisasi Permanen?',
    body: 'Tindakan ini tidak bisa dibatalkan. Organisasi hanya bisa dihapus kalau tidak ada workspace aktif di dalamnya.',
    confirmLabel: 'Hapus Permanen',
  },
}

// S3-07, US-007 (GA Organizations.dc.html) -- versi minimal: edit name/slug,
// toggle aktif/nonaktif dua arah (S3-07 prasyarat Reactivate), ringkasan
// dashboard (S3-06), dan hapus. TANPA domain/logo/retention dari desain
// penuh -- sama alasan CreateOrganizationModal. Bahasa Default (S3-31) dan
// Kuota Storage (S3-36) DITAMBAHKAN di sini (S3 H10) alih-alih halaman
// OrganizationSettingsPage/StorageDashboard terpisah seperti wording task
// asli -- organisasi sudah punya satu modal kelola, tidak perlu halaman
// baru untuk 2 field tambahan. Gauge storage berupa bar teks sederhana
// (used/quota/max) -- breakdown per workspace (S3-35) dan usage real-time
// dari attachments (S3-33) TIDAK ditampilkan, keduanya blocked karena
// tabel attachments belum ada (implementation_gaps.md IG-19).
export default function ManageOrganizationModal({ organization, onClose }: ManageOrganizationModalProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const updateOrganization = useUpdateOrganization(organization?.id ?? '')
  const deactivateOrganization = useDeactivateOrganization()
  const reactivateOrganization = useReactivateOrganization()
  const deleteOrganization = useDeleteOrganization()
  const updateSettings = useUpdateOrganizationSettings(organization?.id ?? '')
  const updateQuota = useUpdateOrganizationStorageQuota(organization?.id ?? '')
  const summary = useOrganizationSummary(organization?.id ?? '')

  const [language, setLanguage] = useState('id')
  const [quotaGb, setQuotaGb] = useState('')

  const form = useForm<UpdateOrganizationFormValues>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: { name: '', slug: '' },
  })

  useEffect(() => {
    if (organization) {
      form.reset({ name: organization.name, slug: organization.slug })
      setLanguage(organization.default_language)
      setQuotaGb((organization.storage_quota_bytes / GB).toFixed(1))
    }
  }, [organization, form])

  const handleClose = () => {
    setConfirmAction(null)
    onClose()
  }

  const onSubmit = (values: UpdateOrganizationFormValues) => {
    updateOrganization.mutate(values)
  }

  const handleConfirm = () => {
    if (!organization || !confirmAction) return
    if (confirmAction === 'deactivate') {
      deactivateOrganization.mutate(organization.id, { onSuccess: () => setConfirmAction(null) })
    } else if (confirmAction === 'reactivate') {
      reactivateOrganization.mutate(organization.id, { onSuccess: () => setConfirmAction(null) })
    } else {
      deleteOrganization.mutate(organization.id, { onSuccess: handleClose })
    }
  }

  const handleSaveLanguage = () => {
    updateSettings.mutate(language)
  }

  const handleSaveQuota = () => {
    const gb = Number(quotaGb)
    if (Number.isNaN(gb) || gb <= 0) return
    updateQuota.mutate(Math.round(gb * GB))
  }

  const updateErrorMessage = updateOrganization.error instanceof ApiError ? updateOrganization.error.message : null
  const settingsErrorMessage = updateSettings.error instanceof ApiError ? updateSettings.error.message : null
  const quotaErrorMessage = updateQuota.error instanceof ApiError ? updateQuota.error.message : null
  const deleteErrorMessage = deleteOrganization.error instanceof ApiError ? deleteOrganization.error.message : null
  const isDeactivated = organization?.deactivated_at !== null
  const confirmPending = deactivateOrganization.isPending || reactivateOrganization.isPending || deleteOrganization.isPending

  return (
    <>
      <Dialog open={organization !== null && confirmAction === null} onOpenChange={(next) => !next && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kelola Organisasi</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-5 py-5">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama Organisasi</Label>
              <Input id="edit-name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input id="edit-slug" {...form.register('slug')} />
              {form.formState.errors.slug && (
                <p className="text-[11px] text-destructive">{form.formState.errors.slug.message}</p>
              )}
            </div>
            {updateErrorMessage && <p className="text-[11px] text-destructive">{updateErrorMessage}</p>}
            <Button
              type="submit"
              variant="outline"
              disabled={updateOrganization.isPending}
              className="w-fit font-mono text-[10px] uppercase tracking-[0.06em]"
            >
              {updateOrganization.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>

            <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-language">Bahasa Default</Label>
                <select
                  id="edit-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="border border-line-strong bg-bg-deep px-2 py-1.5 font-mono text-[11px] text-text-body outline-none"
                >
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English</option>
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveLanguage}
                disabled={updateSettings.isPending}
                className="font-mono text-[10px] uppercase tracking-[0.06em]"
              >
                {updateSettings.isPending ? 'Menyimpan...' : 'Simpan Bahasa'}
              </Button>
              {settingsErrorMessage && <p className="text-[11px] text-destructive">{settingsErrorMessage}</p>}
            </div>

            <div className="border-t border-line pt-4">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Kuota Storage</p>
              {organization && (
                <div className="mb-2">
                  <div className="h-2 w-full bg-line-subtle">
                    <div
                      className={cn(
                        'h-full',
                        summary.data && summary.data.storage_used_bytes / organization.storage_quota_bytes >= 0.8
                          ? 'bg-amber'
                          : 'bg-mint',
                      )}
                      style={{
                        width: `${Math.min(100, ((summary.data?.storage_used_bytes ?? 0) / organization.storage_quota_bytes) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[9px] text-text-muted">
                    {((summary.data?.storage_used_bytes ?? 0) / GB).toFixed(2)} GB / {(organization.storage_quota_bytes / GB).toFixed(1)} GB
                    {' · maks '}
                    {(organization.storage_max_bytes / GB).toFixed(0)} GB
                  </p>
                </div>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-quota">Kuota (GB)</Label>
                  <Input
                    id="edit-quota"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={quotaGb}
                    onChange={(e) => setQuotaGb(e.target.value)}
                    className="w-28"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveQuota}
                  disabled={updateQuota.isPending}
                  className="font-mono text-[10px] uppercase tracking-[0.06em]"
                >
                  {updateQuota.isPending ? 'Menyimpan...' : 'Simpan Kuota'}
                </Button>
              </div>
              {quotaErrorMessage && <p className="mt-2 text-[11px] text-destructive">{quotaErrorMessage}</p>}
            </div>

            <div className="border-t border-line pt-4">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Ringkasan</p>
              {summary.isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
              {summary.isError && <p className="text-sm text-destructive">Gagal memuat ringkasan.</p>}
              {summary.data && (
                <div className="grid grid-cols-3 gap-3 font-mono text-[11px] text-text-body">
                  <div>
                    <div className="text-[9px] uppercase text-text-dim">Member</div>
                    {summary.data.member_count}
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-text-dim">Workspace</div>
                    {summary.data.workspace_count}
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-text-dim">Storage</div>
                    {(summary.data.storage_used_bytes / (1024 * 1024)).toFixed(1)} MB
                  </div>
                </div>
              )}
            </div>
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
