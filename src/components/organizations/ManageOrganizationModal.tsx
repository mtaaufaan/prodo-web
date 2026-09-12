import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import SsoConfigModal from '@/components/organizations/SsoConfigModal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useAddOrganizationDomain,
  useDeactivateOrganization,
  useDeleteOrganization,
  useOrganizationDomains,
  useReactivateOrganization,
  useRemoveOrganizationDomain,
  useUpdateOrganization,
  useUpdateOrganizationSettings,
  useUpdateOrganizationStorageQuota,
} from '@/features/organizations/hooks'
import {
  addOrganizationDomainSchema,
  updateOrganizationSchema,
  updateStorageQuotaSchema,
  type Organization,
  type UpdateOrganizationFormValues,
  type UpdateStorageQuotaFormValues,
} from '@/features/organizations/types'
import { useGroups } from '@/features/platform-admin/hooks'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const GB = 1024 * 1024 * 1024

interface ManageOrganizationModalProps {
  organization: Organization | null
  onClose: () => void
}

type ConfirmAction = 'deactivate' | 'reactivate' | null

const CONFIRM_COPY: Record<Exclude<ConfirmAction, null>, { title: string; body: string; confirmLabel: string }> = {
  deactivate: {
    title: 'Nonaktifkan Organisasi?',
    body: 'Seluruh member organisasi ini akan kehilangan akses. Retensi 90 hari mulai berjalan sebelum data operasional dihapus permanen. Data tetap tersimpan dan bisa diaktifkan kembali kapan saja.',
    confirmLabel: 'Nonaktifkan',
  },
  reactivate: {
    title: 'Aktifkan Kembali Organisasi?',
    body: 'Akses member organisasi ini akan dipulihkan dan jadwal penghapusan dibatalkan.',
    confirmLabel: 'Aktifkan',
  },
}

// S4G-03, Track S4G (desain "GA Organizations.dc.html") -- diperkaya dari
// versi minimal S3-07: tambah domain, kuota+retensi digabung satu section
// dengan validasi live, hint status, dan zona berbahaya (blocked kalau
// masih ada workspace, kalau tidak -- konfirmasi ketik slug). Ringkasan
// (member/workspace/storage) sekarang dibaca LANGSUNG dari `organization`
// (field ditambahkan S4G-03 di GET /organizations) -- request
// GetSummary terpisah yang dipakai versi lama DIHAPUS, datanya sama
// persis, cuma sumbernya digabung ke satu response list. Logo TETAP di
// luar scope (task terpisah, dikonfirmasi user -- perlu infrastruktur
// MinIO baru, bukan cuma field form).
export default function ManageOrganizationModal({ organization, onClose }: ManageOrganizationModalProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [ssoModalOpen, setSsoModalOpen] = useState(false)
  const updateOrganization = useUpdateOrganization(organization?.id ?? '')
  const deactivateOrganization = useDeactivateOrganization()
  const reactivateOrganization = useReactivateOrganization()
  const deleteOrganization = useDeleteOrganization()
  const updateSettings = useUpdateOrganizationSettings(organization?.id ?? '')
  const updateQuota = useUpdateOrganizationStorageQuota(organization?.id ?? '')
  const domainsQuery = useOrganizationDomains(organization?.id ?? '')
  const addDomain = useAddOrganizationDomain(organization?.id ?? '')
  const removeDomain = useRemoveOrganizationDomain(organization?.id ?? '')
  const [newDomain, setNewDomain] = useState('')
  const [domainError, setDomainError] = useState<string | null>(null)

  const [language, setLanguage] = useState('id')
  const [saveNotice, setSaveNotice] = useState('')
  const prevOrgIdRef = useRef<string | null>(null)

  const infoForm = useForm<UpdateOrganizationFormValues>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: { name: '', slug: '' },
  })
  const quotaForm = useForm<UpdateStorageQuotaFormValues>({
    resolver: zodResolver(updateStorageQuotaSchema),
    defaultValues: { quota_gb: 0, retention_days: 90 },
  })

  useEffect(() => {
    if (organization) {
      infoForm.reset({ name: organization.name, slug: organization.slug })
      quotaForm.reset({
        quota_gb: Number((organization.storage_quota_bytes / GB).toFixed(2)),
        retention_days: organization.retention_days,
      })
      setLanguage(organization.default_language)
      setDeleteConfirmText('')
      setNewDomain('')
      setDomainError(null)
      // saveNotice HANYA direset saat ganti organisasi (atau tutup lalu buka
      // lagi) -- bukan setiap refetch, supaya notifikasi sukses tidak
      // langsung tertimpa kosong oleh invalidateQueries yang dipicu save
      // itu sendiri (organization prop berubah referensi begitu list refetch).
      if (prevOrgIdRef.current !== organization.id) setSaveNotice('')
      prevOrgIdRef.current = organization.id
    } else {
      prevOrgIdRef.current = null
    }
  }, [organization, infoForm, quotaForm])

  const handleAddDomain = () => {
    const parsed = addOrganizationDomainSchema.safeParse({ domain: newDomain.trim() })
    if (!parsed.success) {
      setDomainError(parsed.error.issues[0]?.message ?? 'Format domain tidak valid')
      return
    }
    setDomainError(null)
    addDomain.mutate(parsed.data.domain, { onSuccess: () => setNewDomain('') })
  }

  const handleClose = () => {
    setConfirmAction(null)
    setSsoModalOpen(false)
    onClose()
  }

  const handleConfirm = () => {
    if (!organization || !confirmAction) return
    if (confirmAction === 'deactivate') {
      deactivateOrganization.mutate(organization.id, { onSuccess: () => setConfirmAction(null) })
    } else {
      reactivateOrganization.mutate(organization.id, { onSuccess: () => setConfirmAction(null) })
    }
  }

  // Watch + baseline per-field (dipakai onSubmitAll DI BAWAH untuk kirim
  // cuma field yang benar-benar berubah, dan notice dirty/tersimpan). Harus
  // dideklarasikan sebelum onSubmitAll karena dipakai di situ.
  const nameWatch = infoForm.watch('name')
  const quotaGbWatch = quotaForm.watch('quota_gb')
  const retentionDaysWatch = quotaForm.watch('retention_days')
  const quotaGbOriginal = organization ? Number((organization.storage_quota_bytes / GB).toFixed(2)) : 0
  const nameDirty = organization !== null && nameWatch !== organization.name
  const languageDirty = organization !== null && language !== organization.default_language
  const quotaDirty =
    organization !== null && (quotaGbWatch !== quotaGbOriginal || retentionDaysWatch !== organization.retention_days)

  // onSubmitAll -- satu tombol SIMPAN PERUBAHAN (desain "GA Organizations.dc.html")
  // menyimpan identitas+domain, bahasa, dan kuota+retensi sekaligus, walau di
  // backend tetap 3 endpoint terpisah (S3-29/30/31 US-010, S3-32/34/36 US-011,
  // dari sebelum konsolidasi tampilan S4G-03) -- reuse penuh, tidak ada
  // endpoint baru. Validasi infoForm dulu, baru quotaForm, submit HANYA kalau
  // keduanya valid. Tiap mutation HANYA dipanggil kalau section-nya sendiri
  // benar-benar berubah (nameDirty/languageDirty/quotaDirty) -- SEBELUMNYA
  // ketiganya selalu dipanggil apa pun yang diubah, jadi ganti nama saja
  // ikut menulis "organization.storage_quota_updated" ke audit trail
  // (ditemukan user 2026-09-12: ubah nama, tapi Audit Trail mencatat "Kuota
  // atau retensi organisasi diperbarui" juga) -- backend memang selalu audit
  // tiap kali endpoint itu dipanggil, TIDAK mengecek apakah nilainya benar-
  // benar beda, jadi FE yang wajib tidak memanggilnya kalau tidak perlu.
  const onSubmitAll = infoForm.handleSubmit((infoValues) =>
    quotaForm.handleSubmit(async (quotaValues) => {
      try {
        await Promise.all([
          nameDirty ? updateOrganization.mutateAsync(infoValues) : Promise.resolve(),
          languageDirty ? updateSettings.mutateAsync(language) : Promise.resolve(),
          quotaDirty
            ? updateQuota.mutateAsync({ quotaBytes: Math.round(quotaValues.quota_gb * GB), retentionDays: quotaValues.retention_days })
            : Promise.resolve(),
        ])
        setSaveNotice('Perubahan organisasi tersimpan.')
      } catch {
        // error masing-masing mutation sudah tampil lewat *ErrorMessage di bawah
      }
    })(),
  )
  const savingAll = updateOrganization.isPending || updateSettings.isPending || updateQuota.isPending

  const handleDelete = () => {
    if (!organization) return
    deleteOrganization.mutate(organization.id, { onSuccess: handleClose })
  }

  const updateErrorMessage = updateOrganization.error instanceof ApiError ? updateOrganization.error.message : null
  const settingsErrorMessage = updateSettings.error instanceof ApiError ? updateSettings.error.message : null
  const quotaErrorMessage = updateQuota.error instanceof ApiError ? updateQuota.error.message : null
  const deleteErrorMessage = deleteOrganization.error instanceof ApiError ? deleteOrganization.error.message : null
  const isDeactivated = organization?.deactivated_at !== null

  // Validasi live kuota vs storage terpakai (S4G-03, desain "GA Organizations.dc.html")
  // -- bisa dicek client-side karena storage_used_bytes organisasi ini
  // sudah ada di tangan (dari list), TANPA perlu fetch tambahan. Kuota
  // melebihi plafon GRUP sengaja TIDAK divalidasi live di sini (butuh
  // angka plafon per-organisasi-lain yang tidak murah dihitung di FE) --
  // backend menegakkannya, errornya tampil lewat quotaErrorMessage setelah submit.
  const usedGb = organization ? organization.storage_used_bytes / GB : 0
  const quotaBelowUsed = organization !== null && !Number.isNaN(quotaGbWatch) && quotaGbWatch < usedGb
  const confirmPending = deactivateOrganization.isPending || reactivateOrganization.isPending

  // Plafon retensi TIER grup (S4G-34, Track S4G, desain "GA Add
  // Organization.dc.html" -- hint "RANGE {min}-{max} (BATAS TIER
  // {nama})"). Reuse GET /platform/groups yang sudah dipakai
  // CreateOrganizationModal, dicocokkan lewat organization.group_id --
  // tanpa endpoint baru. Fallback 30/365 (batas keras backend) sebelum
  // data grup termuat.
  const groups = useGroups('')
  const orgGroup = groups.data?.find((g) => g.id === organization?.group_id) ?? null
  const retentionMin = orgGroup?.min_retention_days ?? 30
  const retentionMax = orgGroup?.max_retention_days ?? 365
  const retentionOutOfRange =
    !Number.isNaN(retentionDaysWatch) && (retentionDaysWatch < retentionMin || retentionDaysWatch > retentionMax)

  // Notifikasi perubahan belum tersimpan / tersimpan (pola sama GroupLocalePage
  // "Bahasa & Lokal", diuji coba di sini dulu -- IG-60 lanjutan atas permintaan
  // user 2026-09-12).
  const dirty = nameDirty || languageDirty || quotaDirty

  const hasWorkspaces = (organization?.workspace_count ?? 0) > 0
  const deleteMatches = organization !== null && deleteConfirmText === organization.slug

  return (
    <>
      <Dialog open={organization !== null && confirmAction === null} onOpenChange={(next) => !next && handleClose()}>
        <DialogContent className="max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Kelola Organisasi</DialogTitle>
          </DialogHeader>

          <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-5 py-4">
            <form id="org-manage-form" onSubmit={onSubmitAll} noValidate className="flex flex-col gap-4">
              <input type="hidden" {...infoForm.register('slug')} />
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Informasi Organisasi</p>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nama Organisasi</Label>
                <Input id="edit-name" {...infoForm.register('name')} />
                {infoForm.formState.errors.name && (
                  <p className="text-[11px] text-destructive">{infoForm.formState.errors.name.message}</p>
                )}
              </div>
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
              {updateErrorMessage && <p className="text-[11px] text-destructive">{updateErrorMessage}</p>}
              {settingsErrorMessage && <p className="text-[11px] text-destructive">{settingsErrorMessage}</p>}

              <div className="border-t border-line pt-4">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Alokasi Kuota Storage</p>
                {organization && (
                  <div className="mb-3">
                    <div className="h-2 w-full bg-line-subtle">
                      <div
                        className={cn(
                          'h-full',
                          organization.storage_used_bytes / organization.storage_quota_bytes >= 0.8 ? 'bg-amber' : 'bg-mint',
                        )}
                        style={{
                          width: `${Math.min(100, (organization.storage_used_bytes / organization.storage_quota_bytes) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 font-mono text-[9px] text-text-muted">
                      {usedGb.toFixed(2)} GB / {(organization.storage_quota_bytes / GB).toFixed(1)} GB
                      {' · maks '}
                      {(organization.storage_max_bytes / GB).toFixed(0)} GB
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-quota">Kuota (GB)</Label>
                    <Input id="edit-quota" type="number" step="0.1" min="0" className="w-28" {...quotaForm.register('quota_gb', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-retention">Retensi (Hari)</Label>
                    <Input id="edit-retention" type="number" step="1" min="30" max="365" className="w-24" {...quotaForm.register('retention_days', { valueAsNumber: true })} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-[9px] text-text-muted">
                  Kuota minimal sebesar storage terpakai ({usedGb.toFixed(2)} GB) · retensi {retentionMin}-{retentionMax} hari (batas tier{' '}
                  {(orgGroup?.tier ?? '-').toUpperCase()}).
                </p>
                {quotaBelowUsed && (
                  <p className="mt-1 text-[11px] text-destructive">
                    ⚠ Kuota tidak boleh lebih kecil dari storage terpakai ({usedGb.toFixed(2)} GB).
                  </p>
                )}
                {retentionOutOfRange && (
                  <p className="mt-1 text-[11px] text-destructive">
                    ⚠ Retensi harus antara {retentionMin} dan {retentionMax} hari.
                  </p>
                )}
                {quotaForm.formState.errors.quota_gb && (
                  <p className="mt-1 text-[11px] text-destructive">{quotaForm.formState.errors.quota_gb.message}</p>
                )}
                {quotaForm.formState.errors.retention_days && (
                  <p className="mt-1 text-[11px] text-destructive">{quotaForm.formState.errors.retention_days.message}</p>
                )}
                {quotaErrorMessage && <p className="mt-2 text-[11px] text-destructive">{quotaErrorMessage}</p>}
              </div>
            </form>

            <div className="border-t border-line pt-4">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Domain Email Resmi</p>
              <div className="flex flex-wrap gap-1.5">
                {(domainsQuery.data?.domains ?? []).map((d) => (
                  <span key={d.id} className="flex items-center gap-1.5 border border-line-strong px-2 py-1 font-mono text-[10.5px] text-text-body">
                    {d.domain}
                    <button
                      type="button"
                      onClick={() => removeDomain.mutate(d.id)}
                      disabled={removeDomain.isPending}
                      aria-label={`Hapus domain ${d.domain}`}
                      className="text-text-muted hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {domainsQuery.data?.domains.length === 0 && <p className="text-[11px] text-text-muted">Belum ada domain terdaftar.</p>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="acme.co.id"
                  className="w-48"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddDomain}
                  disabled={addDomain.isPending || !newDomain.trim()}
                  className="font-mono text-[10px] uppercase tracking-[0.06em]"
                >
                  + Tambah
                </Button>
              </div>
              {domainError && <p className="mt-1 text-[11px] text-destructive">{domainError}</p>}
              {addDomain.error instanceof ApiError && <p className="mt-1 text-[11px] text-destructive">{addDomain.error.message}</p>}
              {removeDomain.error instanceof ApiError && <p className="mt-1 text-[11px] text-destructive">{removeDomain.error.message}</p>}
              <p className="mt-2 text-[11px] text-text-muted">Hanya email pada salah satu domain ini yang dapat diundang lewat Import Data CSV.</p>
            </div>

            <div className="border-t border-line pt-4">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Status Organisasi</p>
              <p className="mb-2 text-[11px] text-text-muted">
                {isDeactivated
                  ? 'Organisasi nonaktif — hitungan retensi 90 hari berjalan. Mengaktifkan kembali memulihkan akses member dan membatalkan jadwal penghapusan.'
                  : 'Menonaktifkan memblokir akses seluruh member dan memulai hitungan retensi 90 hari sebelum data operasional dihapus permanen.'}
              </p>
              <Button
                type="button"
                onClick={() => setConfirmAction(isDeactivated ? 'reactivate' : 'deactivate')}
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em]"
              >
                {isDeactivated ? 'Aktifkan Kembali' : 'Nonaktifkan'}
              </Button>
            </div>

            {/* 2026-09-12: Hapus Organisasi diubah dari hard-delete jadi
                soft-delete (ditemukan user via pengujian live role Group
                Admin) -- konsisten dengan Hapus Workspace, dipulihkan dari
                menu Data Retention, BUKAN lagi "permanen" seketika. */}
            <div className="border-t border-line pt-4">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-destructive">Zona Berbahaya</p>
              {hasWorkspaces ? (
                <p className="text-[11px] text-text-muted">
                  Organisasi tidak dapat dihapus selama masih memiliki {organization?.workspace_count} workspace. Hapus atau
                  pindahkan seluruh workspace terlebih dahulu.
                </p>
              ) : (
                <>
                  <p className="mb-2 text-[11px] text-text-muted">
                    Organisasi masuk jadwal penghapusan sesuai retensi organisasi ({organization?.retention_days} hari) -- lihat menu
                    Data Retention untuk memulihkan selama tenggat itu berjalan. Ketik{' '}
                    <span className="font-mono text-text-body">{organization?.slug}</span> untuk konfirmasi.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={organization?.slug}
                      className="w-48"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!deleteMatches || deleteOrganization.isPending}
                      onClick={handleDelete}
                      className="border-destructive font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deleteOrganization.isPending ? 'Menghapus...' : 'Hapus Organisasi'}
                    </Button>
                  </div>
                  {deleteErrorMessage && <p className="mt-2 text-[11px] text-destructive">{deleteErrorMessage}</p>}
                </>
              )}
            </div>

            <p className="mt-4 border-t border-line pt-4 font-mono text-[9px] text-text-dim">
              Seluruh perubahan pada organisasi — termasuk penonaktifan, pengaktifan kembali, dan penghapusan — tercatat
              di Audit Trail grup (aktor, timestamp UTC, nilai sebelum → sesudah).
            </p>

            {organization && (
              <div className="border-t border-line pt-4">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Ringkasan</p>
                <div className="grid grid-cols-3 gap-3 font-mono text-[11px] text-text-body">
                  <div>
                    <div className="text-[9px] uppercase text-text-dim">Member</div>
                    {organization.member_count}
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-text-dim">Workspace</div>
                    {organization.workspace_count}
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-text-dim">Storage</div>
                    {(organization.storage_used_bytes / (1024 * 1024)).toFixed(1)} MB
                  </div>
                </div>
                <Link
                  to={`/groups/${organization.group_id}/cross-org-memberships`}
                  className="mt-2 inline-block font-mono text-[10px] text-text-muted hover:text-signal"
                >
                  Lihat Cross-Org Membership →
                </Link>
                <button
                  type="button"
                  onClick={() => setSsoModalOpen(true)}
                  className="mt-2 block font-mono text-[10px] text-text-muted hover:text-signal"
                >
                  Konfigurasi SSO →
                </button>
              </div>
            )}
          </div>

          {dirty && (
            <p className="mx-5 mb-3 border border-amber p-2.5 font-mono text-[10px] leading-relaxed text-amber">
              Ada perubahan yang belum disimpan. Tekan "Simpan Perubahan" untuk menerapkan.
            </p>
          )}
          {!dirty && saveNotice && (
            <p className="mx-5 mb-3 border border-mint p-2.5 font-mono text-[10px] text-mint">✓ {saveNotice}</p>
          )}

          <DialogFooter>
            <Button
              type="submit"
              form="org-manage-form"
              disabled={savingAll || retentionOutOfRange}
              className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]"
            >
              {savingAll ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmAction(null)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
                  Batal
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={confirmPending}
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]"
                >
                  {confirmPending ? 'Memproses...' : CONFIRM_COPY[confirmAction].confirmLabel}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <SsoConfigModal organization={ssoModalOpen ? organization : null} onClose={() => setSsoModalOpen(false)} />
    </>
  )
}
