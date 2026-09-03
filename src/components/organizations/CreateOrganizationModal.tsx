import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateOrganization, useOrganizationList } from '@/features/organizations/hooks'
import { createOrganizationSchema, type CreateOrganizationFormValues } from '@/features/organizations/types'
import { useGroups } from '@/features/platform-admin/hooks'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const GB = 1024 * 1024 * 1024

interface CreateOrganizationModalProps {
  open: boolean
  onClose: () => void
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// S4G-05, Track S4G (desain "GA Add Organization.dc.html") -- diperkaya dari
// versi minimal S3-07: domain/bahasa/retensi/kuota kini diisi sekali submit
// (backend S4G-05 menerima seluruhnya di POST /organizations, reuse
// validasi OrganizationRepository.UpdateStorageQuota). Slug tidak lagi
// diinput manual -- diturunkan otomatis dari nama dan ditampilkan sebagai
// hint saja, sama seperti desain. Logo TETAP di luar scope (task terpisah,
// butuh infrastruktur MinIO -- dikonfirmasi user, sama alasan
// ManageOrganizationModal). Rate-limit client-side demo desain (3x/60dtk)
// TIDAK direplikasi -- tidak ada padanan backend, murni simulasi demo.
// Header/footer FIXED, cuma body yang scroll (design-system.md §9.1 anatomi
// modal) -- versi awal menaruh DialogFooter DI DALAM <form> yang sama dengan
// overflow-y-auto, jadi tombol submit ikut ke-scroll bareng field terakhir
// begitu tinggi modal melebihi viewport. Diperbaiki: <form> cuma jadi
// pembungkus submit (tidak scroll sendiri), field-field dibungkus <div>
// terpisah yang scroll, DialogFooter jadi sibling SETELAH div itu supaya
// tetap menempel di bawah -- pola sama seperti ManageOrganizationModal.
//
// Ditemukan user lewat perbandingan langsung ke Claude Design (bukan cuma
// baca .dc.html): (1) picker "Grup Pemilik" TIDAK ada di desain -- grup
// ditampilkan sebagai konteks di header ("Buat organisasi dalam grup
// {{groupName}}"), bukan field pilihan. TAPI `group_admin_assignments`
// (DATABASE_SCHEMA.md §5.6) many-to-many -- satu GA BISA mengelola lebih
// dari satu grup, desain (ga-store.js) tidak memodelkan kasus itu sama
// sekali. Kompromi: picker cuma tampil kalau actor benar-benar punya >1
// grup (GA multi-grup, atau Platform Admin) -- kasus umum (1 grup) grup
// otomatis terpilih dan cuma ditampilkan sebagai teks header, sesuai
// desain. (2) Urutan tombol footer desain: BUAT ORGANISASI (primer) DI
// KIRI, TUTUP DI KANAN -- kebalikan dari yang saya bangun sebelumnya.
export default function CreateOrganizationModal({ open, onClose }: CreateOrganizationModalProps) {
  const createOrganization = useCreateOrganization()
  const groups = useGroups('')
  const orgList = useOrganizationList()
  const form = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { group_id: '', name: '', slug: '', domain: '', default_language: 'id', quota_gb: 25, retention_days: 90 },
  })

  const name = form.watch('name')
  const groupId = form.watch('group_id')
  const quotaGbWatch = form.watch('quota_gb')

  useEffect(() => {
    form.setValue('slug', slugify(name), { shouldValidate: false })
  }, [name, form])

  // Grup otomatis terpilih kalau actor cuma punya satu (kasus GA umum,
  // sesuai desain) -- picker cuma perlu ditampilkan kalau ada >1 pilihan.
  const singleGroup = groups.data?.length === 1 ? groups.data[0] : null
  const needsGroupPicker = (groups.data?.length ?? 0) > 1
  useEffect(() => {
    if (singleGroup) form.setValue('group_id', singleGroup.id, { shouldValidate: false })
  }, [singleGroup, form])

  const handleClose = () => {
    form.reset()
    onClose()
  }

  const onSubmit = (values: CreateOrganizationFormValues) => {
    createOrganization.mutate(values, { onSuccess: handleClose })
  }

  const errorMessage = createOrganization.error instanceof ApiError ? createOrganization.error.message : null

  const activeGroup = groups.data?.find((g) => g.id === groupId) ?? singleGroup ?? null

  // Plafon grup dibaca dari GET /organizations (S4G-03, sudah ada) -- 0
  // berarti viewer lintas grup (Platform Admin) dan tidak bisa dihitung
  // live di sini, backend tetap menegakkannya saat submit.
  const ceilingBytes = orgList.data?.group_storage_ceiling_bytes ?? 0
  const { allocatedBytes, orgCount } = useMemo(() => {
    const orgsInGroup = orgList.data?.organizations.filter((o) => o.group_id === groupId) ?? []
    return { allocatedBytes: orgsInGroup.reduce((sum, o) => sum + o.storage_quota_bytes, 0), orgCount: orgsInGroup.length }
  }, [orgList.data, groupId])
  const remainingBytes = Math.max(0, ceilingBytes - allocatedBytes)
  const showQuotaBar = ceilingBytes > 0
  const quotaExceedsRemaining = showQuotaBar && !Number.isNaN(quotaGbWatch) && quotaGbWatch * GB > remainingBytes

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Tambah Organisasi Baru</DialogTitle>
          <p className="mt-1.5 text-sm font-semibold text-text-body">
            Buat organisasi{activeGroup ? ` dalam grup ${activeGroup.name}` : ''}
          </p>
          {activeGroup && (
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              Grup {activeGroup.name} — tier {activeGroup.tier}
              {showQuotaBar && (
                <>
                  , plafon {(ceilingBytes / GB).toFixed(0)} GB. Sudah teralokasi {(allocatedBytes / GB).toFixed(1)} GB ke{' '}
                  {orgCount} organisasi; sisa {(remainingBytes / GB).toFixed(1)} GB dapat dialokasikan.
                </>
              )}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col">
          <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-5">
            {needsGroupPicker && (
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
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nama Organisasi</Label>
              <Input id="name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>
              )}
              {form.watch('slug') && (
                <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-muted">
                  Slug · {form.watch('slug')}.prodo.app
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Domain Email Resmi</Label>
              <Input id="domain" placeholder={activeGroup ? `manufaktur.${activeGroup.name.toLowerCase()}.co.id` : 'acme.co.id'} {...form.register('domain')} />
              <p className="text-[11px] text-text-muted">Hanya email pada domain ini yang dapat diundang ke organisasi.</p>
              {form.formState.errors.domain && (
                <p className="text-[11px] text-destructive">{form.formState.errors.domain.message}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="space-y-2">
                <Label htmlFor="default_language">Bahasa Default</Label>
                <select
                  id="default_language"
                  {...form.register('default_language')}
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="retention_days">Retensi Data (Hari)</Label>
                <Input id="retention_days" type="number" step="1" min="30" max="365" className="w-24" {...form.register('retention_days')} />
                {form.formState.errors.retention_days && (
                  <p className="text-[11px] text-destructive">{form.formState.errors.retention_days.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quota_gb">Alokasi Kuota Storage (GB)</Label>
              <Input id="quota_gb" type="number" step="0.1" min="0.1" className="w-28" {...form.register('quota_gb')} />
              {showQuotaBar && (
                <div>
                  <div className="h-2 w-full bg-line-subtle">
                    <div
                      className={cn('h-full', quotaExceedsRemaining ? 'bg-destructive' : 'bg-mint')}
                      style={{ width: `${Math.min(100, (((quotaGbWatch || 0) * GB) / remainingBytes) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[9px] text-text-muted">
                    {(quotaGbWatch || 0).toFixed(1)} / {(remainingBytes / GB).toFixed(1)} GB sisa plafon grup
                  </p>
                </div>
              )}
              {quotaExceedsRemaining && (
                <p className="text-[11px] text-destructive">⚠ Melebihi sisa kuota global grup ({(remainingBytes / GB).toFixed(1)} GB).</p>
              )}
              {form.formState.errors.quota_gb && (
                <p className="text-[11px] text-destructive">{form.formState.errors.quota_gb.message}</p>
              )}
            </div>

            <div className="border-t border-line pt-3">
              <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-amber">Langkah Berikutnya</p>
              <p className="text-[11px] text-text-muted">
                Organisasi baru belum punya workspace, sehingga belum perlu Admin Workspace. Penunjukan Admin Workspace dilakukan
                saat workspace pertama dibuat dari menu Workspace — dan bersifat wajib di sana.
              </p>
              <p className="mt-1 text-[11px] text-text-muted">
                Member lain dapat diundang kapan saja dari menu Members &amp; Roles setelah workspace tersedia.
              </p>
            </div>

            {errorMessage && <p className="text-[11px] text-destructive">{errorMessage}</p>}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={createOrganization.isPending || quotaExceedsRemaining}
              className="font-mono text-[10px] uppercase tracking-[0.06em]"
            >
              {createOrganization.isPending ? 'Membuat...' : 'Buat Organisasi'}
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
