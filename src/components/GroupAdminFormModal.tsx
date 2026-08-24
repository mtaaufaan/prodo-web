import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import {
  useCreateGroupAdmin,
  useGroupAdminDetail,
  useResendActivation,
  useServiceTiers,
  useUpdateGroupAdmin,
} from '@/features/platform-admin/hooks'
import {
  SERVICE_TIERS,
  createGroupAdminSchema,
  updateGroupAdminSchema,
  type CreateGroupAdminFormValues,
  type GroupAdmin,
  type ServiceTier,
  type ServiceTierName,
  type UpdateGroupAdminFormValues,
} from '@/features/platform-admin/types'

export type GroupAdminFormMode = 'add' | 'edit' | 'view'

interface GroupAdminFormModalProps {
  mode: GroupAdminFormMode
  groupAdminId: string | null // null di mode "add"
  open: boolean
  onClose: () => void
}

const selectClassName =
  'flex h-9 w-full rounded-none border border-line bg-input-bg px-2.5 py-2 font-sans text-[13px] text-text-body focus-visible:outline-none focus-visible:border-signal disabled:cursor-not-allowed disabled:opacity-50'

// GroupAdminFormModal -- S4P-06, desain "PA Group Admin Form" (mode
// add/edit/view). Field Kredensial Login "Khusus Demo" di desain SENGAJA
// tidak diimplementasikan -- menampilkan/menyimpan password bertentangan
// dengan model Keycloak-delegated (password tidak pernah disimpan
// backend), dan copy desainnya sendiri berlabel "khusus demo, di
// produksi PA cuma kirim invitation link".
export default function GroupAdminFormModal({ mode, groupAdminId, open, onClose }: GroupAdminFormModalProps) {
  const isAdd = mode === 'add'
  const isView = mode === 'view'

  const tiers = useServiceTiers()
  const detail = useGroupAdminDetail(!isAdd ? groupAdminId : null)
  const createGroupAdmin = useCreateGroupAdmin()
  const updateGroupAdmin = useUpdateGroupAdmin(groupAdminId ?? '')
  const resendActivation = useResendActivation()
  const [resendSent, setResendSent] = useState(false)

  const createForm = useForm<CreateGroupAdminFormValues>({
    resolver: zodResolver(createGroupAdminSchema),
    defaultValues: {
      email: '',
      display_name: '',
      group_name: '',
      job_title: '',
      address: '',
      phone: '',
      tier: 'starter',
      storage_quota_gb: 20,
    },
  })
  const editForm = useForm<UpdateGroupAdminFormValues>({
    resolver: zodResolver(updateGroupAdminSchema),
    defaultValues: {
      display_name: '',
      group_name: '',
      job_title: '',
      address: '',
      phone: '',
      tier: 'starter',
      storage_quota_gb: 20,
      status: '',
    },
  })

  // Sinkron field dari data server begitu detail termuat (mode edit/view).
  useEffect(() => {
    if (!isAdd && detail.data) {
      editForm.reset({
        display_name: detail.data.display_name,
        group_name: detail.data.group_name ?? '',
        job_title: detail.data.job_title ?? '',
        address: detail.data.address ?? '',
        phone: detail.data.phone ?? '',
        tier: (detail.data.tier ?? 'starter') as ServiceTierName,
        storage_quota_gb: detail.data.storage_quota_gb ?? detail.data.tier_max_storage_gb,
        status: detail.data.status === 'TIDAK AKTIF' ? '' : detail.data.status,
      })
    }
  }, [isAdd, detail.data, editForm])

  // Reset form + status resend setiap modal dibuka ulang untuk target/mode baru.
  useEffect(() => {
    if (open && isAdd) {
      createForm.reset({
        email: '',
        display_name: '',
        group_name: '',
        job_title: '',
        address: '',
        phone: '',
        tier: 'starter',
        storage_quota_gb: 20,
      })
    }
    setResendSent(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, groupAdminId])

  const applyTierDefault = (tier: ServiceTierName, setValue: (v: number) => void) => {
    const found = tiers.data?.find((t) => t.name === tier)
    if (found) setValue(found.max_storage_gb)
  }

  const onSubmitAdd = (values: CreateGroupAdminFormValues) => {
    createGroupAdmin.mutate(values, { onSuccess: onClose })
  }
  const onSubmitEdit = (values: UpdateGroupAdminFormValues) => {
    updateGroupAdmin.mutate(values, { onSuccess: onClose })
  }
  const handleResend = () => {
    if (!groupAdminId) return
    resendActivation.mutate(groupAdminId, { onSuccess: () => setResendSent(true) })
  }

  const title = isAdd ? 'Tambah Group Admin' : isView ? 'Detail Group Admin' : 'Ubah Group Admin'
  const errorMessage =
    createGroupAdmin.error instanceof ApiError
      ? createGroupAdmin.error.message
      : updateGroupAdmin.error instanceof ApiError
        ? updateGroupAdmin.error.message
        : null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-pa-accent">{title}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-5 py-4">
          {!isAdd && detail.isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
          {!isAdd && detail.isError && <p className="text-sm text-destructive">Gagal memuat detail Group Admin.</p>}

          {(isAdd || detail.data) && (
            <form
              onSubmit={isAdd ? createForm.handleSubmit(onSubmitAdd) : editForm.handleSubmit(onSubmitEdit)}
              className="space-y-3.5"
            >
              <div className="space-y-1.5">
                <Label htmlFor="ga-display-name">Nama Group Admin</Label>
                <Input
                  id="ga-display-name"
                  disabled={isView}
                  {...(isAdd ? createForm.register('display_name') : editForm.register('display_name'))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ga-group-name">Nama Perusahaan / Grup</Label>
                  <Input
                    id="ga-group-name"
                    disabled={isView}
                    {...(isAdd ? createForm.register('group_name') : editForm.register('group_name'))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ga-job-title">Jabatan PIC</Label>
                  <Input
                    id="ga-job-title"
                    disabled={isView}
                    {...(isAdd ? createForm.register('job_title') : editForm.register('job_title'))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ga-address">Alamat Perusahaan</Label>
                <textarea
                  id="ga-address"
                  disabled={isView}
                  className={selectClassName + ' min-h-[52px] resize-y'}
                  {...(isAdd ? createForm.register('address') : editForm.register('address'))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ga-email">Email</Label>
                  {isAdd ? (
                    <Input id="ga-email" type="email" {...createForm.register('email')} />
                  ) : (
                    <Input id="ga-email" type="email" disabled defaultValue={detail.data?.email ?? ''} />
                  )}
                  {!isAdd && <p className="text-[10px] text-text-dim">Email tidak dapat diubah setelah akun dibuat.</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ga-phone">No. Telepon (PIC)</Label>
                  <Input
                    id="ga-phone"
                    disabled={isView}
                    {...(isAdd ? createForm.register('phone') : editForm.register('phone'))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ga-tier">Tier</Label>
                  <select
                    id="ga-tier"
                    disabled={isView}
                    className={selectClassName}
                    {...(isAdd
                      ? createForm.register('tier', {
                          onChange: (e) => applyTierDefault(e.target.value, (v) => createForm.setValue('storage_quota_gb', v)),
                        })
                      : editForm.register('tier', {
                          onChange: (e) => applyTierDefault(e.target.value, (v) => editForm.setValue('storage_quota_gb', v)),
                        }))}
                  >
                    {SERVICE_TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ga-plafon">Plafon Storage Grup (GB)</Label>
                  <Input
                    id="ga-plafon"
                    type="number"
                    disabled={isView}
                    {...(isAdd ? createForm.register('storage_quota_gb') : editForm.register('storage_quota_gb'))}
                  />
                </div>
              </div>

              {!isView && (
                <TierFactsPanel
                  tierName={(isAdd ? createForm.watch('tier') : editForm.watch('tier')) as ServiceTierName}
                  tiers={tiers.data}
                />
              )}

              {isView && detail.data && <UsagePanel groupAdmin={detail.data} />}

              {!isAdd && !isView && (
                <div className="space-y-1.5">
                  <Label htmlFor="ga-status">Status</Label>
                  <select id="ga-status" className={selectClassName} {...editForm.register('status')}>
                    <option value="">Tidak diubah</option>
                    <option value="AKTIF">AKTIF</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              )}

              {mode === 'edit' && (
                <div className="flex items-center gap-2.5 border border-amber/40 bg-amber/10 px-3 py-2.5">
                  <div className="flex-1">
                    <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-amber">Invitation Link</div>
                    <div className="mt-0.5 font-mono text-[9px] text-text-dim">
                      {resendSent
                        ? '✓ Invitation link terkirim ulang ke email Group Admin.'
                        : 'Kirim ulang invitation link aktivasi akun.'}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-amber/60 font-mono text-[10px] uppercase tracking-[0.04em] text-amber"
                    disabled={resendActivation.isPending}
                    onClick={handleResend}
                  >
                    {resendActivation.isPending ? 'Mengirim...' : 'Kirim Invitation Link'}
                  </Button>
                </div>
              )}

              {errorMessage && <p className="text-[11px] text-destructive">{errorMessage}</p>}

              <p className="text-[10.5px] leading-relaxed text-text-dim">
                Kuota global mengikuti plafon tier dan tidak dapat diubah manual -- Group Admin membagi alokasi ke
                tiap organisasi di dalam plafon ini.
              </p>
            </form>
          )}
        </div>

        <DialogFooter>
          {!isView && (
            <Button
              type="button"
              className="flex-1 bg-pa-accent font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-bg-deep hover:bg-pa-accent-hover"
              disabled={createGroupAdmin.isPending || updateGroupAdmin.isPending}
              onClick={isAdd ? createForm.handleSubmit(onSubmitAdd) : editForm.handleSubmit(onSubmitEdit)}
            >
              {isAdd
                ? createGroupAdmin.isPending
                  ? 'Menambahkan...'
                  : 'Tambahkan'
                : updateGroupAdmin.isPending
                  ? 'Menyimpan...'
                  : 'Simpan Perubahan'}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} className={isView ? 'flex-1' : ''}>
            {isView ? 'Keluar' : 'Batal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TierFactsPanel({ tierName, tiers }: { tierName: ServiceTierName; tiers?: ServiceTier[] }) {
  const tier = tiers?.find((t) => t.name === tierName)
  if (!tier) return null
  return (
    <div className="flex flex-col gap-1.5 border border-line bg-bg-deep p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
        Paket Tier {tierName.toUpperCase()} (Otomatis)
      </div>
      {[
        ['Rentang Retensi', `${tier.min_retention_days}–${tier.max_retention_days} hari`],
        ['Rate Webhook · SSO', `${tier.webhook_rate} event/mnt · SSO ${tier.sso_enabled ? 'AKTIF' : 'TIDAK'}`],
        ['Jumlah Organisasi', String(tier.max_org)],
        ['Kuota Global (Total Grup)', `${tier.max_storage_gb} GB`],
        ['Maks Member', tier.max_members.toLocaleString('id-ID')],
      ].map(([label, value]) => (
        <div key={label} className="flex items-center gap-2.5">
          <span className="font-mono text-[10.5px] text-text-muted">{label}</span>
          <span className="ml-auto font-mono text-[13px] font-semibold text-mint">{value}</span>
        </div>
      ))}
    </div>
  )
}

function UsagePanel({ groupAdmin }: { groupAdmin: GroupAdmin }) {
  const plafon = groupAdmin.storage_quota_gb ?? groupAdmin.tier_max_storage_gb
  const usedGB = (groupAdmin.used_storage_mb / 1024).toFixed(1)
  return (
    <div className="flex flex-col gap-1.5 border border-mint/40 bg-mint/10 p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-mint">Pemanfaatan Saat Ini</div>
      {[
        ['Organisasi Terpakai', `${groupAdmin.used_org_count} / ${groupAdmin.tier_max_org} org`],
        ['Kuota Global Terpakai', `${usedGB} / ${plafon} GB`],
        ['Member Terpakai', `${groupAdmin.used_member_count.toLocaleString('id-ID')} / ${groupAdmin.tier_max_members.toLocaleString('id-ID')}`],
      ].map(([label, value]) => (
        <div key={label} className="flex items-center gap-2.5">
          <span className="font-mono text-[10.5px] text-text-muted">{label}</span>
          <span className="ml-auto font-mono text-[13px] font-semibold text-text-bone">{value}</span>
        </div>
      ))}
    </div>
  )
}
