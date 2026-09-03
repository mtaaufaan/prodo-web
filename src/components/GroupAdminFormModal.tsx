import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { cn, localeForLanguage } from '@/lib/utils'
import {
  useCreateGroupAdmin,
  useGroupAdminDetail,
  useRenewGroupContract,
  useResendActivation,
  useServiceTiers,
  useUpdateGroupAdmin,
} from '@/features/platform-admin/hooks'
import {
  createGroupAdminSchema,
  renewGroupContractSchema,
  updateGroupAdminSchema,
  type CreateGroupAdminFormValues,
  type GroupAdmin,
  type RenewGroupContractFormValues,
  type ServiceTier,
  type UpdateGroupAdminFormValues,
} from '@/features/platform-admin/types'

export type GroupAdminFormMode = 'add' | 'edit' | 'view'

interface GroupAdminFormModalProps {
  mode: GroupAdminFormMode
  groupAdminId: string | null // null di mode "add"
  // groupId (S4G-07, Track S4G): grup SPESIFIK dari baris panel yang
  // diklik -- satu akun bisa mengelola >1 grup (DATABASE_SCHEMA.md §5.6),
  // panel sekarang satu baris per grup, jadi modal ini WAJIB tahu grup
  // mana yang sedang dibuka, bukan menebak "grup pertama" lagi. null di
  // mode "add" atau baris 0-grup.
  groupId: string | null
  open: boolean
  onClose: () => void
}

// Desain "PA Group Admin Form" memakai IBM Plex Mono di SELURUH field
// (beda dari Input/Select bersama di components/ui yang dikalibrasi
// Archivo untuk form member app biasa, docs/design-system.md §10.1) --
// PA console punya bahasa tipografi sendiri (lihat juga PlatformLoginPage
// & tailwind.config.ts "Platform Admin -- separate namespace").
const paFieldFont = 'font-mono text-[12.5px]'
const selectClassName =
  `flex h-9 w-full rounded-none border border-line bg-input-bg px-2.5 py-2 ${paFieldFont} text-text-body focus-visible:outline-none focus-visible:border-signal disabled:cursor-not-allowed disabled:opacity-50`

// GroupAdminFormModal -- S4P-06, desain "PA Group Admin Form" (mode
// add/edit/view). Field Kredensial Login "Khusus Demo" di desain SENGAJA
// tidak diimplementasikan -- menampilkan/menyimpan password bertentangan
// dengan model Keycloak-delegated (password tidak pernah disimpan
// backend), dan copy desainnya sendiri berlabel "khusus demo, di
// produksi PA cuma kirim invitation link".
export default function GroupAdminFormModal({ mode, groupAdminId, groupId, open, onClose }: GroupAdminFormModalProps) {
  const { t, i18n } = useTranslation()
  const locale = localeForLanguage(i18n.language)
  const isAdd = mode === 'add'
  const isView = mode === 'view'

  const tiers = useServiceTiers()
  const detail = useGroupAdminDetail(!isAdd ? groupAdminId : null, groupId)
  const createGroupAdmin = useCreateGroupAdmin()
  const updateGroupAdmin = useUpdateGroupAdmin(groupAdminId ?? '', groupId)
  const resendActivation = useResendActivation()
  const [resendSent, setResendSent] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)
  // linkedExistingEmail (S4G-07): begitu email yang diisi match GA aktif
  // existing, backend menautkan grup baru ke akun itu TANPA invitation
  // baru -- modal TIDAK auto-close seperti alur biasa, supaya PA sadar
  // ini bukan akun baru (dikonfirmasi user: harus ada peringatan
  // eksplisit, bukan diam-diam sama seperti sukses biasa).
  const [linkedExistingEmail, setLinkedExistingEmail] = useState<string | null>(null)

  const createForm = useForm<CreateGroupAdminFormValues>({
    resolver: zodResolver(createGroupAdminSchema),
    defaultValues: {
      email: '',
      display_name: '',
      group_name: '',
      job_title: '',
      address: '',
      phone: '',
      tier_id: '',
      storage_quota_gb: 20,
      contract_start_at: '',
      contract_subscription_period: '',
      contract_invoice_number: '',
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
      tier_id: '',
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
        tier_id: detail.data.tier_id ?? '',
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
        tier_id: '',
        storage_quota_gb: 20,
        contract_start_at: '',
        contract_subscription_period: '',
        contract_invoice_number: '',
      })
    }
    setResendSent(false)
    setRenewOpen(false)
    setLinkedExistingEmail(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, groupAdminId])

  // Default tier_id ke tier pertama begitu katalog termuat (mode Tambah)
  // -- tier_id tidak bisa di-hardcode lagi seperti "starter" sejak S4P-11
  // (ID dinamis, bukan nama tetap).
  useEffect(() => {
    if (isAdd && open && tiers.data && tiers.data.length > 0 && !createForm.getValues('tier_id')) {
      const first = tiers.data[0]
      createForm.setValue('tier_id', first.id)
      createForm.setValue('storage_quota_gb', first.max_storage_gb)
    }
  }, [isAdd, open, tiers.data, createForm])

  // tierOptions -- daftar tier assignable ditambah tier SAAT INI milik GA
  // ini kalau sudah nonaktif/archived (S4P-11) supaya edit field lain
  // tidak diam-diam memindahkan GA ke tier lain hanya karena tier
  // lamanya tidak lagi muncul di daftar assignable.
  const tierOptions: { id: string; name: string }[] = (() => {
    const base = (tiers.data ?? []).map((item) => ({ id: item.id, name: item.name }))
    if (!isAdd && detail.data?.tier_id && detail.data.tier && !base.some((item) => item.id === detail.data?.tier_id)) {
      base.push({ id: detail.data.tier_id, name: detail.data.tier })
    }
    return base
  })()

  const applyTierDefault = (tierId: string, setValue: (v: number) => void) => {
    const found = tiers.data?.find((item) => item.id === tierId)
    if (found) setValue(found.max_storage_gb)
  }

  const onSubmitAdd = (values: CreateGroupAdminFormValues) => {
    createGroupAdmin.mutate(values, {
      onSuccess: (result) => {
        if (result.linked_existing_admin) {
          setLinkedExistingEmail(values.email)
        } else {
          onClose()
        }
      },
    })
  }
  const onSubmitEdit = (values: UpdateGroupAdminFormValues) => {
    // IG-23: cek proaktif di klien pakai used_storage_mb yang sudah termuat
    // (mode Ubah selalu punya detail.data) supaya user dapat feedback
    // instan tanpa round-trip -- backend TETAP jadi sumber kebenaran
    // (service.UpdateGroupAdmin), jadi ini murni UX, bukan pengganti.
    if (detail.data) {
      const usedGB = Math.ceil(detail.data.used_storage_mb / 1024)
      if (values.storage_quota_gb < usedGB) {
        editForm.setError('storage_quota_gb', {
          message: t('groupAdminFormModal.validation.quotaBelowUsage', { usedGB }),
        })
        return
      }
    }
    updateGroupAdmin.mutate(values, { onSuccess: onClose })
  }
  const handleResend = () => {
    if (!groupAdminId) return
    resendActivation.mutate(groupAdminId, { onSuccess: () => setResendSent(true) })
  }

  const title = isAdd
    ? t('groupAdminFormModal.title.add')
    : isView
      ? t('groupAdminFormModal.title.view')
      : t('groupAdminFormModal.title.edit')
  const apiError =
    createGroupAdmin.error instanceof ApiError
      ? createGroupAdmin.error
      : updateGroupAdmin.error instanceof ApiError
        ? updateGroupAdmin.error
        : null
  // IG-23: STORAGE_QUOTA_BELOW_USAGE ditampilkan inline di bawah field
  // Plafon Storage (meniru plafonHint/plafonBorder desain "PA Group Admin
  // Form"), bukan di banner umum -- error lain tetap lewat banner umum.
  const quotaBelowUsageMessage = apiError?.code === 'STORAGE_QUOTA_BELOW_USAGE' ? apiError.message : null
  const errorMessage = apiError && !quotaBelowUsageMessage ? apiError.message : null

  return (
    <>
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-pa-accent">{title}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-5 py-4">
          {!isAdd && detail.isLoading && <p className="font-mono text-sm text-text-muted">{t('groupAdminFormModal.loading')}</p>}
          {!isAdd && detail.isError && (
            <p className="font-mono text-sm text-destructive">{t('groupAdminFormModal.loadError')}</p>
          )}

          {linkedExistingEmail && (
            <div className="space-y-1.5 border border-amber/40 bg-amber/10 p-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-amber">
                {t('groupAdminFormModal.linkedExisting.heading')}
              </div>
              <p className="font-mono text-[11px] text-text-body">
                {t('groupAdminFormModal.linkedExisting.body', { email: linkedExistingEmail })}
              </p>
            </div>
          )}

          {!linkedExistingEmail && (isAdd || detail.data) && (
            <form
              onSubmit={isAdd ? createForm.handleSubmit(onSubmitAdd) : editForm.handleSubmit(onSubmitEdit)}
              className="space-y-3.5"
            >
              <div className="space-y-1.5">
                <Label htmlFor="ga-display-name">{t('groupAdminFormModal.fields.displayName')}</Label>
                <Input
                  id="ga-display-name"
                  className={paFieldFont}
                  disabled={isView}
                  {...(isAdd ? createForm.register('display_name') : editForm.register('display_name'))}
                />
                <FieldError message={(isAdd ? createForm : editForm).formState.errors.display_name?.message} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ga-group-name">{t('groupAdminFormModal.fields.groupName')}</Label>
                  <Input
                    id="ga-group-name"
                    className={paFieldFont}
                    disabled={isView}
                    {...(isAdd ? createForm.register('group_name') : editForm.register('group_name'))}
                  />
                  <FieldError message={(isAdd ? createForm : editForm).formState.errors.group_name?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ga-job-title">{t('groupAdminFormModal.fields.jobTitle')}</Label>
                  <Input
                    id="ga-job-title"
                    className={paFieldFont}
                    disabled={isView}
                    {...(isAdd ? createForm.register('job_title') : editForm.register('job_title'))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ga-address">{t('groupAdminFormModal.fields.address')}</Label>
                <textarea
                  id="ga-address"
                  disabled={isView}
                  className={selectClassName + ' min-h-[52px] resize-y'}
                  {...(isAdd ? createForm.register('address') : editForm.register('address'))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ga-email">{t('groupAdminFormModal.fields.email')}</Label>
                  {isAdd ? (
                    <>
                      <Input id="ga-email" type="email" className={paFieldFont} {...createForm.register('email')} />
                      <FieldError message={createForm.formState.errors.email?.message} />
                    </>
                  ) : (
                    <Input id="ga-email" type="email" className={paFieldFont} disabled defaultValue={detail.data?.email ?? ''} />
                  )}
                  {!isAdd && (
                    <p className="font-mono text-[10px] text-text-dim">{t('groupAdminFormModal.fields.emailImmutableHint')}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ga-phone">{t('groupAdminFormModal.fields.phone')}</Label>
                  <Input
                    id="ga-phone"
                    className={paFieldFont}
                    disabled={isView}
                    {...(isAdd ? createForm.register('phone') : editForm.register('phone'))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ga-tier">{t('groupAdminFormModal.fields.tier')}</Label>
                  <select
                    id="ga-tier"
                    disabled={isView}
                    className={selectClassName}
                    {...(isAdd
                      ? createForm.register('tier_id', {
                          onChange: (e) => applyTierDefault(e.target.value, (v) => createForm.setValue('storage_quota_gb', v)),
                        })
                      : editForm.register('tier_id', {
                          onChange: (e) => applyTierDefault(e.target.value, (v) => editForm.setValue('storage_quota_gb', v)),
                        }))}
                  >
                    {tierOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <FieldError message={(isAdd ? createForm : editForm).formState.errors.tier_id?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ga-plafon">{t('groupAdminFormModal.fields.storageQuota')}</Label>
                  <Input
                    id="ga-plafon"
                    type="number"
                    className={paFieldFont}
                    disabled={isView}
                    {...(isAdd ? createForm.register('storage_quota_gb') : editForm.register('storage_quota_gb'))}
                  />
                  <FieldError
                    message={(isAdd ? createForm : editForm).formState.errors.storage_quota_gb?.message ?? quotaBelowUsageMessage ?? undefined}
                  />
                </div>
              </div>

              {!isView && (
                <TierFactsPanel
                  tierId={isAdd ? createForm.watch('tier_id') : editForm.watch('tier_id')}
                  tiers={tiers.data}
                />
              )}

              {isView && detail.data && <UsagePanel groupAdmin={detail.data} />}

              {isAdd && (
                <div className="space-y-1.5 border border-line bg-bg-deep p-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
                    {t('groupAdminFormModal.contract.initialHeading')}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ga-contract-start">{t('groupAdminFormModal.contract.startDate')}</Label>
                      <Input
                        id="ga-contract-start"
                        type="date"
                        className={paFieldFont}
                        {...createForm.register('contract_start_at')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ga-contract-period">{t('groupAdminFormModal.contract.subscriptionPeriod.label')}</Label>
                      <select
                        id="ga-contract-period"
                        className={selectClassName}
                        {...createForm.register('contract_subscription_period')}
                      >
                        <option value="">{t('groupAdminFormModal.contract.subscriptionPeriod.placeholder')}</option>
                        <option value="monthly">{t('groupAdminFormModal.contract.subscriptionPeriod.monthly')}</option>
                        <option value="quarterly">{t('groupAdminFormModal.contract.subscriptionPeriod.quarterly')}</option>
                        <option value="yearly">{t('groupAdminFormModal.contract.subscriptionPeriod.yearly')}</option>
                      </select>
                      <FieldError message={createForm.formState.errors.contract_subscription_period?.message} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ga-contract-invoice">{t('groupAdminFormModal.contract.invoiceNumber')}</Label>
                      <Input
                        id="ga-contract-invoice"
                        className={paFieldFont}
                        {...createForm.register('contract_invoice_number')}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!isAdd && detail.data && (
                <div className="space-y-1.5 border border-line bg-bg-deep p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
                      {t('groupAdminFormModal.contract.heading')}
                    </div>
                    {!isView && detail.data.group_id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-pa-accent font-mono text-[10px] uppercase tracking-[0.04em] text-pa-accent"
                        onClick={() => setRenewOpen(true)}
                      >
                        {detail.data.contract_end_at
                          ? t('groupAdminFormModal.contract.renewButton')
                          : t('groupAdminFormModal.contract.createButton')}
                      </Button>
                    )}
                  </div>
                  {detail.data.contract_end_at ? (
                    <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-text-body">
                      <div>
                        <span className="text-text-dim">{t('groupAdminFormModal.contract.startLabel')}</span>
                        {formatContractDate(detail.data.contract_start_at, locale)}
                      </div>
                      <div>
                        <span className="text-text-dim">{t('groupAdminFormModal.contract.periodLabel')}</span>
                        {subscriptionPeriodLabel(t, detail.data.subscription_period)}
                      </div>
                      <div>
                        <span className="text-text-dim">{t('groupAdminFormModal.contract.endLabel')}</span>
                        {formatContractDate(detail.data.contract_end_at, locale)}
                      </div>
                    </div>
                  ) : (
                    <p className="font-mono text-[11px] text-text-muted">{t('groupAdminFormModal.contract.none')}</p>
                  )}
                  {detail.data.invoice_number && (
                    <p className="font-mono text-[10px] text-text-dim">
                      {t('groupAdminFormModal.contract.invoicePrefix', { number: detail.data.invoice_number })}
                    </p>
                  )}
                </div>
              )}

              {!isAdd && !isView && (
                <div className="space-y-1.5">
                  <Label htmlFor="ga-status">{t('groupAdminFormModal.fields.status')}</Label>
                  <select id="ga-status" className={selectClassName} {...editForm.register('status')}>
                    <option value="">{t('groupAdminFormModal.status.unchanged')}</option>
                    <option value="AKTIF">{t('groupAdminFormModal.status.active')}</option>
                    <option value="SUSPENDED">{t('groupAdminFormModal.status.suspended')}</option>
                  </select>
                </div>
              )}

              {mode === 'edit' && (
                <div className="flex items-center gap-2.5 border border-amber/40 bg-amber/10 px-3 py-2.5">
                  <div className="flex-1">
                    <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-amber">
                      {t('groupAdminFormModal.invitation.heading')}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] text-text-dim">
                      {resendSent
                        ? t('groupAdminFormModal.invitation.resent')
                        : t('groupAdminFormModal.invitation.prompt')}
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
                    {resendActivation.isPending
                      ? t('groupAdminFormModal.invitation.sending')
                      : t('groupAdminFormModal.invitation.sendButton')}
                  </Button>
                </div>
              )}

              {errorMessage && <p className="font-mono text-[11px] text-destructive">{errorMessage}</p>}

              <p className="font-mono text-[9.5px] leading-relaxed text-text-dim">
                {t('groupAdminFormModal.footer.quotaNote')}
              </p>
            </form>
          )}
        </div>

        <DialogFooter>
          {!isView && !linkedExistingEmail && (
            <Button
              type="button"
              className="flex-1 bg-pa-accent font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-bg-deep hover:bg-pa-accent-hover"
              disabled={createGroupAdmin.isPending || updateGroupAdmin.isPending}
              onClick={isAdd ? createForm.handleSubmit(onSubmitAdd) : editForm.handleSubmit(onSubmitEdit)}
            >
              {isAdd
                ? createGroupAdmin.isPending
                  ? t('groupAdminFormModal.actions.adding')
                  : t('groupAdminFormModal.actions.add')
                : updateGroupAdmin.isPending
                  ? t('groupAdminFormModal.actions.saving')
                  : t('groupAdminFormModal.actions.saveChanges')}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn('font-mono text-[11px]', (isView || linkedExistingEmail) && 'flex-1')}
          >
            {isView || linkedExistingEmail ? t('groupAdminFormModal.actions.exit') : t('groupAdminFormModal.actions.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {!isAdd && groupAdminId && detail.data?.group_id && (
      <RenewContractDialog
        groupAdminId={groupAdminId}
        groupId={detail.data.group_id}
        currentEndAt={detail.data?.contract_end_at ?? null}
        currentPeriod={detail.data?.subscription_period ?? null}
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
      />
    )}
    </>
  )
}

// formatContractDate/subscriptionPeriodLabel -- kontrak grup (dikonfirmasi
// user 2026-08-29), tampilan ringkas tanggal + label masa langganan.
function formatContractDate(iso: string | null, locale: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function subscriptionPeriodLabel(t: (key: string) => string, period: string | null): string {
  if (!period) return '—'
  const labels: Record<string, string> = {
    monthly: t('groupAdminFormModal.contract.subscriptionPeriod.monthly'),
    quarterly: t('groupAdminFormModal.contract.subscriptionPeriod.quarterly'),
    yearly: t('groupAdminFormModal.contract.subscriptionPeriod.yearly'),
  }
  return labels[period] ?? period
}

// toDateInputValue -- format "YYYY-MM-DD" untuk <input type="date">.
function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// RenewContractDialog -- "Perpanjang Kontrak" (dikonfirmasi user
// 2026-08-29), dipakai baik untuk kontrak PERTAMA grup (currentEndAt
// null, tombol pemicu berlabel "Buat Kontrak") maupun PERPANJANGAN.
// Tanggal mulai default MAX(hari ini, kontrak aktif saat ini) -- supaya
// tidak ada celah (gap) kalau PA telat memperpanjang, dan tidak bisa
// mundur ke masa lalu begitu saja.
function RenewContractDialog({
  groupAdminId,
  groupId,
  currentEndAt,
  currentPeriod,
  open,
  onClose,
}: {
  groupAdminId: string
  groupId: string
  currentEndAt: string | null
  currentPeriod: string | null
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const renew = useRenewGroupContract(groupAdminId, groupId)
  const form = useForm<RenewGroupContractFormValues>({
    resolver: zodResolver(renewGroupContractSchema),
    defaultValues: {
      start_at: '',
      subscription_period: (currentPeriod as RenewGroupContractFormValues['subscription_period']) ?? 'monthly',
      invoice_number: '',
    },
  })

  useEffect(() => {
    if (open) {
      const today = new Date()
      const currentEnd = currentEndAt ? new Date(currentEndAt) : null
      const defaultStart = currentEnd && currentEnd > today ? currentEnd : today
      form.reset({
        start_at: toDateInputValue(defaultStart),
        subscription_period: (currentPeriod as RenewGroupContractFormValues['subscription_period']) ?? 'monthly',
        invoice_number: '',
      })
    }
  }, [open, currentEndAt, currentPeriod, form])

  const onSubmit = (values: RenewGroupContractFormValues) => {
    renew.mutate(values, { onSuccess: onClose })
  }

  const errorMessage = renew.error instanceof ApiError ? renew.error.message : null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-pa-accent">
            {currentEndAt
              ? t('groupAdminFormModal.contract.renewButton')
              : t('groupAdminFormModal.contract.createButton')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5 px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="renew-start-at">{t('groupAdminFormModal.contract.startDate')}</Label>
            <Input id="renew-start-at" type="date" className={paFieldFont} {...form.register('start_at')} />
            <FieldError message={form.formState.errors.start_at?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="renew-period">{t('groupAdminFormModal.contract.subscriptionPeriod.label')}</Label>
            <select id="renew-period" className={selectClassName} {...form.register('subscription_period')}>
              <option value="monthly">{t('groupAdminFormModal.contract.subscriptionPeriod.monthly')}</option>
              <option value="quarterly">{t('groupAdminFormModal.contract.subscriptionPeriod.quarterly')}</option>
              <option value="yearly">{t('groupAdminFormModal.contract.subscriptionPeriod.yearly')}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="renew-invoice">{t('groupAdminFormModal.contract.invoiceNumber')}</Label>
            <Input id="renew-invoice" className={paFieldFont} {...form.register('invoice_number')} />
          </div>
          {errorMessage && <p className="font-mono text-[11px] text-destructive">{errorMessage}</p>}
        </form>
        <DialogFooter>
          <Button
            type="button"
            className="flex-1 bg-pa-accent font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-bg-deep hover:bg-pa-accent-hover"
            disabled={renew.isPending}
            onClick={form.handleSubmit(onSubmit)}
          >
            {renew.isPending ? t('groupAdminFormModal.actions.saving') : t('groupAdminFormModal.renewContract.save')}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="font-mono text-[11px]">
            {t('groupAdminFormModal.actions.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// FieldError -- IG-23, pola sama dengan PlatformTiersPage.tsx: pesan
// validasi Zod (atau error server yang relevan ke field itu) ditampilkan
// langsung di bawah field, bukan cuma memblokir submit secara diam-diam.
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="font-mono text-[10px] text-destructive">{message}</p>
}

function TierFactsPanel({ tierId, tiers }: { tierId: string; tiers?: ServiceTier[] }) {
  const { t, i18n } = useTranslation()
  const locale = localeForLanguage(i18n.language)
  const tier = tiers?.find((item) => item.id === tierId)
  if (!tier) return null
  return (
    <div className="flex flex-col gap-1.5 border border-line bg-bg-deep p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
        {t('groupAdminFormModal.tierFacts.heading', { tier: tier.name.toUpperCase() })}
      </div>
      {[
        [
          t('groupAdminFormModal.tierFacts.retentionRange'),
          t('groupAdminFormModal.tierFacts.retentionRangeValue', {
            min: tier.min_retention_days,
            max: tier.max_retention_days,
          }),
        ],
        [
          t('groupAdminFormModal.tierFacts.webhookRate'),
          t('groupAdminFormModal.tierFacts.webhookRateValue', {
            rate: tier.webhook_rate,
            sso: tier.sso_enabled
              ? t('groupAdminFormModal.common.on')
              : t('groupAdminFormModal.common.off'),
          }),
        ],
        [t('groupAdminFormModal.tierFacts.orgCount'), String(tier.max_org)],
        [t('groupAdminFormModal.tierFacts.globalQuota'), `${tier.max_storage_gb} GB`],
        [t('groupAdminFormModal.tierFacts.maxMembers'), tier.max_members.toLocaleString(locale)],
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
  const { t, i18n } = useTranslation()
  const locale = localeForLanguage(i18n.language)
  const plafon = groupAdmin.storage_quota_gb ?? groupAdmin.tier_max_storage_gb
  const usedGB = (groupAdmin.used_storage_mb / 1024).toFixed(1)
  return (
    <div className="flex flex-col gap-1.5 border border-mint/40 bg-mint/10 p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-mint">
        {t('groupAdminFormModal.usage.heading')}
      </div>
      {[
        [t('groupAdminFormModal.usage.orgUsed'), `${groupAdmin.used_org_count} / ${groupAdmin.tier_max_org} org`],
        [t('groupAdminFormModal.usage.quotaUsed'), `${usedGB} / ${plafon} GB`],
        [
          t('groupAdminFormModal.usage.membersUsed'),
          `${groupAdmin.used_member_count.toLocaleString(locale)} / ${groupAdmin.tier_max_members.toLocaleString(locale)}`,
        ],
      ].map(([label, value]) => (
        <div key={label} className="flex items-center gap-2.5">
          <span className="font-mono text-[10.5px] text-text-muted">{label}</span>
          <span className="ml-auto font-mono text-[13px] font-semibold text-text-bone">{value}</span>
        </div>
      ))}
    </div>
  )
}
