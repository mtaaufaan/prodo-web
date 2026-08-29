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
  useArchiveTier,
  useCreateTier,
  useDeactivateTier,
  useDeleteTier,
  useReactivateTier,
  useServiceTiers,
  useUnarchiveTier,
  useUpdateTier,
} from '@/features/platform-admin/hooks'
import { serviceTierFormSchema, type ServiceTier, type ServiceTierFormValues } from '@/features/platform-admin/types'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

// paFieldFont/selectClassName -- sama persis dengan GroupAdminFormModal
// (IBM Plex Mono di seluruh field, bahasa tipografi PA console).
const paFieldFont = 'font-mono text-[12.5px]'
const selectClassName =
  `flex h-9 w-full rounded-none border border-line bg-input-bg px-2.5 py-2 ${paFieldFont} text-text-body focus-visible:outline-none focus-visible:border-signal disabled:cursor-not-allowed disabled:opacity-50`

const formDefaults: ServiceTierFormValues = {
  name: '',
  max_storage_gb: 20,
  max_org: 1,
  max_members: 250,
  min_retention_days: 30,
  max_retention_days: 90,
  webhook_rate: 20,
  sso_enabled: false,
}

// PlatformTiersPage -- S4P-11, desain "PA Tier Editor" (project Claude
// Design). Flat/bordered/IBM Plex Mono sesuai bahasa visual PA console
// (bukan shadcn Card, lihat catatan PlatformGroupAdminPage soal ini).
//
// Diperluas dari desain asli: desain cuma tampilkan daftar tier tanpa
// state nonaktif/archived. Toggle "Tampilkan Arsip" + tombol
// Nonaktifkan/Aktifkan/Archive/Pulihkan per baris SENGAJA ditambahkan --
// keputusan lifecycle 2-state independen ini dikonfirmasi user (S4 H7),
// tidak ada di file desain karena desainnya lebih tua dari keputusan itu.
function PlatformTiersPageContent() {
  const { t } = useTranslation()
  const [showArchived, setShowArchived] = useState(false)
  const tiers = useServiceTiers(showArchived)
  const createTier = useCreateTier()
  const deactivateTier = useDeactivateTier()
  const reactivateTier = useReactivateTier()
  const archiveTier = useArchiveTier()
  const unarchiveTier = useUnarchiveTier()
  const deleteTier = useDeleteTier()

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; tier: ServiceTier | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServiceTier | null>(null)
  const [notice, setNotice] = useState('')

  // Notice hilang otomatis setelah 15 detik, sesuai desain "PA Tier Editor".
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 15000)
    return () => clearTimeout(timer)
  }, [notice])

  const tableHeaders = [
    t('platformTiersPage.table.headers.tier'),
    t('platformTiersPage.table.headers.quota'),
    t('platformTiersPage.table.headers.maxOrg'),
    t('platformTiersPage.table.headers.maxMembers'),
    t('platformTiersPage.table.headers.retention'),
    t('platformTiersPage.table.headers.webhookRate'),
    t('platformTiersPage.table.headers.sso'),
    t('platformTiersPage.table.headers.actions'),
  ]

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
            {t('platformTiersPage.eyebrow')}
          </div>
          <div className="mt-1.5 text-base font-bold">
            {showArchived
              ? t('platformTiersPage.summaryShown', { count: tiers.data?.length ?? 0 })
              : t('platformTiersPage.summaryActive', { count: tiers.data?.length ?? 0 })}
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            {t('platformTiersPage.showArchived')}
          </label>
          <button
            type="button"
            onClick={() => setModal({ mode: 'add', tier: null })}
            className="inline-flex items-center gap-2 border border-pa-accent px-3.5 py-2 font-mono text-[11px] tracking-[0.06em] text-pa-accent"
          >
            {t('platformTiersPage.addTierButton')}
          </button>
        </div>
      </div>

      {notice && (
        <div className="relative border border-mint px-3.5 py-2.5 font-mono text-[10px] leading-relaxed text-mint">
          ✓ {notice}
          <button
            type="button"
            onClick={() => setNotice('')}
            className="absolute right-2 top-2 font-mono text-[11px] opacity-60"
            aria-label={t('platformTiersPage.close')}
          >
            ✕
          </button>
        </div>
      )}

      {tiers.isLoading && <p className="font-mono text-sm text-text-muted">{t('platformTiersPage.loading')}</p>}
      {tiers.isError && <p className="font-mono text-sm text-destructive">{t('platformTiersPage.loadError')}</p>}

      {tiers.data && tiers.data.length > 0 && (
        <div className="overflow-x-auto border border-pa-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-pa-header text-left">
                {tableHeaders.map((h) => (
                  <th key={h} className="py-2.5 pl-3.5 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tiers.data.map((tier) => (
                <TierRow
                  key={tier.id}
                  tier={tier}
                  onEdit={() => setModal({ mode: 'edit', tier })}
                  onDeactivate={() =>
                    deactivateTier.mutate(tier.id, {
                      onSuccess: () => setNotice(t('platformTiersPage.noticeDeactivated', { name: tier.name.toUpperCase() })),
                    })
                  }
                  onReactivate={() =>
                    reactivateTier.mutate(tier.id, {
                      onSuccess: () => setNotice(t('platformTiersPage.noticeReactivated', { name: tier.name.toUpperCase() })),
                    })
                  }
                  onArchive={() =>
                    archiveTier.mutate(tier.id, {
                      onSuccess: () => setNotice(t('platformTiersPage.noticeArchived', { name: tier.name.toUpperCase() })),
                    })
                  }
                  onUnarchive={() =>
                    unarchiveTier.mutate(tier.id, {
                      onSuccess: () => setNotice(t('platformTiersPage.noticeUnarchived', { name: tier.name.toUpperCase() })),
                    })
                  }
                  onDelete={() => setDeleteTarget(tier)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2.5 border border-line-subtle p-3.5 font-mono text-[10px] leading-relaxed text-text-muted">
        <div>
          <span className="text-amber">{t('platformTiersPage.legend.quotaLabel')}</span> {t('platformTiersPage.legend.quotaText')}
        </div>
        <div>
          <span className="text-amber">{t('platformTiersPage.legend.retentionLabel')}</span> {t('platformTiersPage.legend.retentionText')}
        </div>
        <div>
          <span className="text-amber">{t('platformTiersPage.legend.webhookSsoLabel')}</span> {t('platformTiersPage.legend.webhookSsoText')}
        </div>
      </div>

      {modal && (
        <TierFormModal
          mode={modal.mode}
          tier={modal.tier}
          onClose={() => setModal(null)}
          createTier={createTier}
          onSuccess={(name) =>
            setNotice(
              modal.mode === 'add'
                ? t('platformTiersPage.noticeCreated', { name: name.toUpperCase() })
                : t('platformTiersPage.noticeUpdated', { name: name.toUpperCase() }),
            )
          }
        />
      )}

      {deleteTarget && (
        <Dialog open onOpenChange={(next) => !next && setDeleteTarget(null)}>
          <DialogContent className="max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="text-pa-accent">{t('platformTiersPage.deleteDialog.title')}</DialogTitle>
            </DialogHeader>
            <div className="px-5 py-4">
              <p className="text-[13px] leading-relaxed text-text-body">
                {t('platformTiersPage.deleteDialog.confirmPrefix')}{' '}
                <b className="text-text-bone">{deleteTarget.name.toUpperCase()}</b>{' '}
                {t('platformTiersPage.deleteDialog.confirmSuffix')}
              </p>
              <p className="mt-2.5 font-mono text-[9.5px] leading-relaxed text-text-dim">
                {t('platformTiersPage.deleteDialog.warning')}
              </p>
              {deleteTier.error instanceof ApiError && (
                <p className="mt-2.5 font-mono text-[11px] text-destructive">{deleteTier.error.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                className="flex-1 bg-pa-accent font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-bg-deep hover:bg-pa-accent-hover"
                disabled={deleteTier.isPending}
                onClick={() =>
                  deleteTier.mutate(deleteTarget.id, {
                    onSuccess: () => {
                      setNotice(t('platformTiersPage.noticeDeleted', { name: deleteTarget.name.toUpperCase() }))
                      setDeleteTarget(null)
                    },
                  })
                }
              >
                {deleteTier.isPending ? t('platformTiersPage.deleteDialog.confirmButtonPending') : t('platformTiersPage.deleteDialog.confirmButton')}
              </Button>
              <Button type="button" variant="outline" className="font-mono text-[11px]" onClick={() => setDeleteTarget(null)}>
                {t('platformTiersPage.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function TierRow({
  tier,
  onEdit,
  onDeactivate,
  onReactivate,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  tier: ServiceTier
  onEdit: () => void
  onDeactivate: () => void
  onReactivate: () => void
  onArchive: () => void
  onUnarchive: () => void
  onDelete: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = localeForLanguage(i18n.language)
  const isDeactivated = tier.deactivated_at != null
  const isArchived = tier.archived_at != null
  return (
    <tr className="border-b border-line last:border-0">
      <td className="py-2.5 pl-3.5 pr-4">
        <div className="text-[13px] font-bold">{tier.name.toUpperCase()}</div>
        <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-text-dim">
          {tier.is_custom ? t('platformTiersPage.row.customTier') : t('platformTiersPage.row.standardTier')}
          {isDeactivated && ` · ${t('platformTiersPage.row.deactivatedTag')}`}
          {isArchived && ` · ${t('platformTiersPage.row.archivedTag')}`}
        </div>
      </td>
      <td className="py-2.5 pr-4 font-mono text-[11px] text-mint">{tier.max_storage_gb} GB</td>
      <td className="py-2.5 pr-4 font-mono text-[11px] text-text-muted">{t('platformTiersPage.row.orgCount', { count: tier.max_org })}</td>
      <td className="py-2.5 pr-4 font-mono text-[11px] text-text-muted">{tier.max_members.toLocaleString(locale)}</td>
      <td className="py-2.5 pr-4 font-mono text-[11px] text-text-muted">
        {t('platformTiersPage.row.retentionDays', { min: tier.min_retention_days, max: tier.max_retention_days })}
      </td>
      <td className="py-2.5 pr-4 font-mono text-[11px] text-text-muted">{t('platformTiersPage.row.webhookPerMinute', { rate: tier.webhook_rate })}</td>
      <td className={cn('py-2.5 pr-4 font-mono text-[10px]', tier.sso_enabled ? 'text-mint' : 'text-text-dim')}>
        {tier.sso_enabled ? t('platformTiersPage.row.ssoActive') : t('platformTiersPage.row.ssoInactive')}
      </td>
      <td className="py-2.5 pr-4">
        <div className="flex flex-wrap gap-2">
          <RowActionButton onClick={onEdit}>{t('platformTiersPage.row.actionManage')}</RowActionButton>
          {isDeactivated ? (
            <RowActionButton onClick={onReactivate}>{t('platformTiersPage.row.actionActivate')}</RowActionButton>
          ) : (
            <RowActionButton onClick={onDeactivate}>{t('platformTiersPage.row.actionDeactivate')}</RowActionButton>
          )}
          {isArchived ? (
            <RowActionButton onClick={onUnarchive}>{t('platformTiersPage.row.actionUnarchive')}</RowActionButton>
          ) : (
            <RowActionButton onClick={onArchive}>{t('platformTiersPage.row.actionArchive')}</RowActionButton>
          )}
          {tier.is_custom && (
            <RowActionButton danger onClick={onDelete}>
              {t('platformTiersPage.row.actionDelete')}
            </RowActionButton>
          )}
        </div>
      </td>
    </tr>
  )
}

function RowActionButton({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.04em]',
        danger ? 'border-red/60 text-red' : 'border-line-strong text-text-muted hover:text-text-bone',
      )}
    >
      {children}
    </button>
  )
}

function TierFormModal({
  mode,
  tier,
  onClose,
  createTier,
  onSuccess,
}: {
  mode: 'add' | 'edit'
  tier: ServiceTier | null
  onClose: () => void
  createTier: ReturnType<typeof useCreateTier>
  onSuccess: (name: string) => void
}) {
  const { t } = useTranslation()
  const isAdd = mode === 'add'
  const updateTier = useUpdateTier(tier?.id ?? '')

  const form = useForm<ServiceTierFormValues>({
    resolver: zodResolver(serviceTierFormSchema),
    defaultValues: tier
      ? {
          name: tier.name,
          max_storage_gb: tier.max_storage_gb,
          max_org: tier.max_org,
          max_members: tier.max_members,
          min_retention_days: tier.min_retention_days,
          max_retention_days: tier.max_retention_days,
          webhook_rate: tier.webhook_rate,
          sso_enabled: tier.sso_enabled,
        }
      : formDefaults,
  })

  const newStorage = form.watch('max_storage_gb')
  const showImpact = !isAdd && tier != null && Number(newStorage) > 0 && Number(newStorage) < tier.max_storage_gb

  const onSubmit = (values: ServiceTierFormValues) => {
    if (isAdd) {
      createTier.mutate(values, { onSuccess: () => { onSuccess(values.name); onClose() } })
    } else {
      updateTier.mutate(values, { onSuccess: () => { onSuccess(values.name); onClose() } })
    }
  }

  const mutation = isAdd ? createTier : updateTier
  const errorMessage = mutation.error instanceof ApiError ? mutation.error.message : null

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-pa-accent">
            {isAdd ? t('platformTiersPage.form.addTitle') : t('platformTiersPage.form.editTitle', { name: tier?.name.toUpperCase() })}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-5 py-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="tier-name">{t('platformTiersPage.form.nameLabel')}</Label>
              <Input id="tier-name" className={paFieldFont} placeholder={t('platformTiersPage.form.namePlaceholder')} {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="font-mono text-[10px] text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tier-storage">{t('platformTiersPage.form.storageLabel')}</Label>
                <Input id="tier-storage" type="number" className={paFieldFont} {...form.register('max_storage_gb')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-org">{t('platformTiersPage.form.maxOrgLabel')}</Label>
                <Input id="tier-org" type="number" className={paFieldFont} {...form.register('max_org')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-members">{t('platformTiersPage.form.maxMembersLabel')}</Label>
                <Input id="tier-members" type="number" className={paFieldFont} {...form.register('max_members')} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tier-min-ret">{t('platformTiersPage.form.minRetentionLabel')}</Label>
                <Input id="tier-min-ret" type="number" className={paFieldFont} {...form.register('min_retention_days')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-max-ret">{t('platformTiersPage.form.maxRetentionLabel')}</Label>
                <Input id="tier-max-ret" type="number" className={paFieldFont} {...form.register('max_retention_days')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-webhook">{t('platformTiersPage.form.webhookRateLabel')}</Label>
                <Input id="tier-webhook" type="number" className={paFieldFont} {...form.register('webhook_rate')} />
              </div>
            </div>
            {(form.formState.errors.min_retention_days || form.formState.errors.max_retention_days) && (
              <p className="font-mono text-[10px] text-destructive">
                {form.formState.errors.min_retention_days?.message ?? form.formState.errors.max_retention_days?.message}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="tier-sso">{t('platformTiersPage.form.ssoLabel')}</Label>
              <select id="tier-sso" className={selectClassName} {...form.register('sso_enabled', { setValueAs: (v) => v === 'true' })}>
                <option value="false">{t('platformTiersPage.form.ssoOptionUnavailable')}</option>
                <option value="true">{t('platformTiersPage.form.ssoOptionActive')}</option>
              </select>
            </div>

            {showImpact && (
              <div className="border border-amber/50 bg-amber/10 px-3 py-2.5 font-mono text-[10px] leading-relaxed text-amber">
                {t('platformTiersPage.form.impactWarning', { oldValue: tier?.max_storage_gb, newValue: newStorage })}
              </div>
            )}

            {errorMessage && <p className="font-mono text-[11px] text-destructive">{errorMessage}</p>}

            <p className="font-mono text-[9px] leading-relaxed text-text-dim">
              {t('platformTiersPage.form.footerNote')}
            </p>
          </form>
        </div>

        <DialogFooter>
          <Button
            type="button"
            className="flex-1 bg-pa-accent font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-bg-deep hover:bg-pa-accent-hover"
            disabled={mutation.isPending}
            onClick={form.handleSubmit(onSubmit)}
          >
            {mutation.isPending ? t('platformTiersPage.form.savingButton') : isAdd ? t('platformTiersPage.form.submitAdd') : t('platformTiersPage.form.submitEdit')}
          </Button>
          <Button type="button" variant="outline" className="font-mono text-[11px]" onClick={onClose}>
            {t('platformTiersPage.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PlatformTiersPage() {
  return (
    <ErrorBoundary>
      <PlatformTiersPageContent />
    </ErrorBoundary>
  )
}
