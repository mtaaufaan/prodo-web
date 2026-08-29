import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import {
  useAddIPAllowlistEntry,
  useDeleteIPAllowlistEntry,
  useSecuritySettings,
  useUpdateIPAllowlistEnabled,
  useUpdateSessionTimeout,
} from '@/features/platform-security/hooks'
import { addIPAllowlistSchema, type AddIPAllowlistFormValues } from '@/features/platform-security/types'

const MIN_SESSION_TIMEOUT_MINUTES = 10
const IP_ALLOWLIST_PAGE_SIZE = 10

// S4P-18, US-070: panel keamanan Platform Admin. TIDAK ADA referensi
// desain -- dicek via DesignSync (Platform Admin Console.dc.html,
// Platform Admin.dc.html) SEBELUM implementasi (pelajaran dari
// PlatformLoginPage/IG-20: jangan berhenti di "tidak ada di folder
// lokal"), keduanya cuma dashboard/demo-nav, tidak ada layar khusus
// pengaturan keamanan. Dibangun mengikuti pola visual+komponen
// PlatformGroupAdminPage yang sudah ada di codebase (token pa-*, shadcn
// Card/Button/Input), bukan meniru layar desain yang tidak ada.
function PlatformSecuritySettingsPageContent() {
  const settings = useSecuritySettings()
  const updateSessionTimeout = useUpdateSessionTimeout()
  const updateAllowlistEnabled = useUpdateIPAllowlistEnabled()
  const addEntry = useAddIPAllowlistEntry()
  const deleteEntry = useDeleteIPAllowlistEntry()

  const [minutesInput, setMinutesInput] = useState('')
  const [timeoutSaved, setTimeoutSaved] = useState(false)
  const [page, setPage] = useState(1)

  // Sinkron field dari data server SEKALI setiap kali nilai server berubah
  // (bukan RHF -- satu field angka sederhana tidak butuh infra form penuh).
  useEffect(() => {
    if (settings.data) {
      setMinutesInput(String(Math.round(settings.data.session_idle_timeout_seconds / 60)))
    }
  }, [settings.data])

  const form = useForm<AddIPAllowlistFormValues>({
    resolver: zodResolver(addIPAllowlistSchema),
    defaultValues: { cidr: '' },
  })

  const minutesValue = Number(minutesInput)
  const minutesInvalid = minutesInput !== '' && (!Number.isFinite(minutesValue) || minutesValue < MIN_SESSION_TIMEOUT_MINUTES)

  const handleSaveTimeout = () => {
    if (minutesInvalid) return
    setTimeoutSaved(false)
    updateSessionTimeout.mutate(Math.round(minutesValue * 60), { onSuccess: () => setTimeoutSaved(true) })
  }

  const handleAddEntry = (values: AddIPAllowlistFormValues) => {
    addEntry.mutate(values.cidr, { onSuccess: () => form.reset() })
  }

  const timeoutErrorMessage = updateSessionTimeout.error instanceof ApiError ? updateSessionTimeout.error.message : null
  const addEntryErrorMessage = addEntry.error instanceof ApiError ? addEntry.error.message : null

  const allowlistEntries = useMemo(() => settings.data?.ip_allowlist ?? [], [settings.data])
  const totalPages = Math.max(1, Math.ceil(allowlistEntries.length / IP_ALLOWLIST_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedEntries = allowlistEntries.slice(
    (currentPage - 1) * IP_ALLOWLIST_PAGE_SIZE,
    currentPage * IP_ALLOWLIST_PAGE_SIZE,
  )

  const pageInputRef = useRef<HTMLInputElement>(null)
  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    setPage(Math.min(totalPages, Math.max(1, n)))
  }

  return (
    <div className="space-y-6 p-6">
      <Card className="border-pa-border shadow-none">
        <CardHeader>
          <CardTitle className="font-extrabold tracking-tight">Session Timeout Platform Admin</CardTitle>
          <CardDescription>
            Berlaku hanya untuk akun Anda sendiri. Sesi tidak diperpanjang oleh aktivitas (non-sliding) --
            berakhir tepat pada waktu tetap sejak login. Minimum {MIN_SESSION_TIMEOUT_MINUTES} menit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings.isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
          {settings.isError && <p className="text-sm text-destructive">Gagal memuat pengaturan keamanan.</p>}
          {settings.data && (
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="session-timeout-minutes">Idle timeout (menit)</Label>
                <Input
                  id="session-timeout-minutes"
                  type="number"
                  min={MIN_SESSION_TIMEOUT_MINUTES}
                  value={minutesInput}
                  onChange={(e) => {
                    setMinutesInput(e.target.value)
                    setTimeoutSaved(false)
                  }}
                  className="w-32"
                />
                {minutesInvalid && (
                  <p className="text-[11px] text-destructive">Minimal {MIN_SESSION_TIMEOUT_MINUTES} menit.</p>
                )}
              </div>
              <Button
                type="button"
                className="bg-pa-accent font-mono text-[11px] uppercase tracking-[0.08em] text-bg-deep hover:bg-pa-accent-hover"
                disabled={updateSessionTimeout.isPending || minutesInvalid || minutesInput === ''}
                onClick={handleSaveTimeout}
              >
                {updateSessionTimeout.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
              {timeoutSaved && <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-mint">Tersimpan</span>}
            </div>
          )}
          {timeoutErrorMessage && <p className="mt-2 text-[11px] text-destructive">{timeoutErrorMessage}</p>}
        </CardContent>
      </Card>

      <Card className="border-pa-border shadow-none">
        <CardHeader>
          <CardTitle className="font-extrabold tracking-tight">IP Allowlist</CardTitle>
          <CardDescription>
            Berlaku untuk SEMUA akun Platform Admin. Kosong atau nonaktif berarti login diperbolehkan dari IP
            mana pun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="mb-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted">
            <input
              type="checkbox"
              checked={settings.data?.ip_allowlist_enabled ?? false}
              disabled={updateAllowlistEnabled.isPending || !settings.data}
              onChange={(e) => updateAllowlistEnabled.mutate(e.target.checked)}
            />
            Aktifkan IP Allowlist
          </label>

          <form onSubmit={form.handleSubmit(handleAddEntry)} className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="cidr">CIDR (mis. 10.0.0.0/24)</Label>
              <Input id="cidr" {...form.register('cidr')} />
              {form.formState.errors.cidr && (
                <p className="text-[11px] text-destructive">{form.formState.errors.cidr.message}</p>
              )}
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                variant="outline"
                className="border-line-strong font-mono text-[11px] uppercase tracking-[0.08em]"
                disabled={addEntry.isPending}
              >
                {addEntry.isPending ? 'Menambah...' : 'Tambah'}
              </Button>
            </div>
          </form>
          {addEntryErrorMessage && <p className="mt-2 text-[11px] text-destructive">{addEntryErrorMessage}</p>}

          <div className="mt-6">
            {allowlistEntries.length === 0 && (
              <p className="text-sm text-text-muted">Belum ada entry -- login tidak dibatasi IP.</p>
            )}
            {allowlistEntries.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="py-2 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">CIDR</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-line last:border-0">
                      <td className="py-2 pr-4 font-mono">{entry.cidr}</td>
                      <td className="py-2 pr-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-line-strong font-mono text-[10px] uppercase tracking-[0.08em] text-destructive"
                          disabled={deleteEntry.isPending && deleteEntry.variables === entry.id}
                          onClick={() => deleteEntry.mutate(entry.id)}
                        >
                          {deleteEntry.isPending && deleteEntry.variables === entry.id ? 'Menghapus...' : 'Hapus'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {allowlistEntries.length > IP_ALLOWLIST_PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-line px-1 py-2.5">
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
        </CardContent>
      </Card>
    </div>
  )
}

export default function PlatformSecuritySettingsPage() {
  return (
    <ErrorBoundary>
      <PlatformSecuritySettingsPageContent />
    </ErrorBoundary>
  )
}
