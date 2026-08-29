import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import {
  useCreatePlatformAdmin,
  useDeactivatePlatformAdmin,
  usePlatformAdmins,
  useReactivatePlatformAdmin,
  useResetPlatformAdminMFA,
} from '@/features/platform-admin/hooks'
import { createPlatformAdminSchema, type CreatePlatformAdminFormValues, type PlatformAdminAccount } from '@/features/platform-admin/types'
import { ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// AddPlatformAdminModal -- S4P-37/40. Tidak ada mockup desain untuk
// layar ini -- ikut bahasa visual konsol PA existing (form paling
// sederhana: cuma email + nama, tidak ada grup/tier seperti Group Admin).
function AddPlatformAdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createAdmin = useCreatePlatformAdmin()
  const form = useForm<CreatePlatformAdminFormValues>({
    resolver: zodResolver(createPlatformAdminSchema),
    defaultValues: { email: '', display_name: '' },
  })

  const handleClose = () => {
    form.reset()
    onClose()
  }

  const onSubmit = (values: CreatePlatformAdminFormValues) => {
    createAdmin.mutate(values, { onSuccess: handleClose })
  }

  const errorMessage = createAdmin.error instanceof ApiError ? createAdmin.error.message : null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Platform Admin</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-5 py-5">
          <div className="space-y-2">
            <Label htmlFor="pa-email">Email</Label>
            <Input id="pa-email" type="email" {...form.register('email')} />
            {form.formState.errors.email && <p className="text-[11px] text-destructive">{form.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pa-display-name">Nama</Label>
            <Input id="pa-display-name" {...form.register('display_name')} />
            {form.formState.errors.display_name && (
              <p className="text-[11px] text-destructive">{form.formState.errors.display_name.message}</p>
            )}
          </div>
          {errorMessage && <p className="text-[11px] text-destructive">{errorMessage}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Batal
            </Button>
            <Button type="submit" disabled={createAdmin.isPending}>
              {createAdmin.isPending ? 'Membuat...' : 'Kirim Undangan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StatusBadge({ admin }: { admin: PlatformAdminAccount }) {
  if (admin.suspended_at) return <span className="font-mono text-[10px] text-text-muted">✕ NONAKTIF</span>
  if (!admin.is_active) return <span className="font-mono text-[10px] text-text-muted">MENUNGGU AKTIVASI</span>
  return <span className="font-mono text-[10px] text-text-body">✓ AKTIF</span>
}

const ADMIN_PAGE_SIZE = 10

// isPendingConfirmation -- "MENUNGGU AKTIVASI" (belum pernah set
// password/MFA), beda dari nonaktif (sudah pernah aktif lalu
// disuspend). Dikonfirmasi user 2026-08-29: grup ini tampil duluan.
function isPendingConfirmation(a: PlatformAdminAccount): boolean {
  return !a.suspended_at && !a.is_active
}

function PlatformAdminAccountsPageContent() {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const admins = usePlatformAdmins()
  const deactivate = useDeactivatePlatformAdmin()
  const reactivate = useReactivatePlatformAdmin()
  const resetMFA = useResetPlatformAdminMFA()
  const [addOpen, setAddOpen] = useState(false)
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null)
  const [page, setPage] = useState(1)

  const runRowAction = (id: string, mutate: (id: string) => Promise<unknown>) => {
    setRowError(null)
    mutate(id).catch((err: unknown) => {
      setRowError({ id, message: err instanceof ApiError ? err.message : 'Aksi gagal, coba lagi.' })
    })
  }

  // Urutan (dikonfirmasi user): belum konfirmasi dulu, sisanya login
  // terbaru dulu.
  const sortedAdmins = useMemo(() => {
    const list = admins.data ?? []
    return [...list].sort((a, b) => {
      const aPending = isPendingConfirmation(a)
      const bPending = isPendingConfirmation(b)
      if (aPending !== bPending) return aPending ? -1 : 1
      const aTime = a.last_login_at ? new Date(a.last_login_at).getTime() : 0
      const bTime = b.last_login_at ? new Date(b.last_login_at).getTime() : 0
      return bTime - aTime
    })
  }, [admins.data])

  const totalPages = Math.max(1, Math.ceil(sortedAdmins.length / ADMIN_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedAdmins = sortedAdmins.slice((currentPage - 1) * ADMIN_PAGE_SIZE, currentPage * ADMIN_PAGE_SIZE)

  const pageInputRef = useRef<HTMLInputElement>(null)
  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    setPage(Math.min(totalPages, Math.max(1, n)))
  }

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Kelola Akun Platform Admin</div>
          <div className="mt-1.5 text-base font-bold">{admins.data?.length ?? 0} akun tercatat</div>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 border border-pa-accent px-3.5 py-2 font-mono text-[11px] tracking-[0.06em] text-pa-accent"
        >
          + Tambah Platform Admin
        </button>
      </div>

      {admins.isLoading && <p className="font-mono text-sm text-text-muted">Memuat...</p>}
      {admins.isError && <p className="font-mono text-sm text-destructive">Gagal memuat daftar Platform Admin.</p>}

      {admins.data && (
        <div className="overflow-x-auto border border-pa-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-pa-header text-left">
                {['Nama', 'Status', 'Login Terakhir', 'Aksi'].map((h) => (
                  <th key={h} className="py-2.5 pl-3.5 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedAdmins.map((a) => {
                const isSelf = a.id === currentUserId
                const isPending = deactivate.isPending || reactivate.isPending || resetMFA.isPending
                return (
                  <tr key={a.id} className="border-b border-line last:border-0">
                    <td className="py-2.5 pl-3.5 pr-4">
                      <div className="text-[13px] text-text-body">
                        {a.display_name} {isSelf && <span className="font-mono text-[9px] text-text-dim">(ANDA)</span>}
                      </div>
                      <div className="font-mono text-[10.5px] text-text-muted">{a.email}</div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge admin={a} />
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-[10.5px] text-text-dim">{formatDate(a.last_login_at)}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          {a.suspended_at ? (
                            <button
                              type="button"
                              disabled={isSelf || isPending}
                              onClick={() => runRowAction(a.id, (id) => reactivate.mutateAsync(id))}
                              className="border border-pa-border px-2.5 py-1 font-mono text-[10px] text-text-muted disabled:opacity-40"
                            >
                              AKTIFKAN
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isSelf || isPending}
                              onClick={() => runRowAction(a.id, (id) => deactivate.mutateAsync(id))}
                              className="border border-destructive px-2.5 py-1 font-mono text-[10px] text-destructive disabled:opacity-40"
                            >
                              NONAKTIFKAN
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isSelf || isPending}
                            onClick={() => runRowAction(a.id, (id) => resetMFA.mutateAsync(id))}
                            className="border border-pa-border px-2.5 py-1 font-mono text-[10px] text-text-muted disabled:opacity-40"
                          >
                            RESET MFA
                          </button>
                        </div>
                        {rowError?.id === a.id && <p className="font-mono text-[10px] text-destructive">{rowError.message}</p>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {sortedAdmins.length === 0 && <p className="p-4 font-mono text-[11px] text-text-muted">Belum ada akun Platform Admin.</p>}
          {sortedAdmins.length > ADMIN_PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-pa-border px-4 py-2.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted disabled:opacity-40"
              >
                ← Sebelumnya
              </button>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-dim">
                Halaman
                <input
                  key={currentPage}
                  ref={pageInputRef}
                  type="number"
                  min={1}
                  max={totalPages}
                  defaultValue={currentPage}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') goToPage(e.currentTarget.value)
                  }}
                  className="w-11 border border-line-strong bg-input-bg px-1 py-0.5 text-center font-mono text-[10px] text-text-body focus-visible:border-signal focus-visible:outline-none"
                  aria-label="Nomor halaman"
                />
                / {totalPages}
                <button
                  type="button"
                  onClick={() => goToPage(pageInputRef.current?.value ?? '')}
                  className="border border-line-strong px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.04em] text-text-muted"
                >
                  Ke
                </button>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted disabled:opacity-40"
              >
                Berikutnya →
              </button>
            </div>
          )}
        </div>
      )}

      <AddPlatformAdminModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

export default function PlatformAdminAccountsPage() {
  return (
    <ErrorBoundary>
      <PlatformAdminAccountsPageContent />
    </ErrorBoundary>
  )
}
