import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
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
  useUpdateSessionTimeout,
} from '@/features/platform-security/hooks'
import { addIPAllowlistSchema, type AddIPAllowlistFormValues } from '@/features/platform-security/types'

const MIN_SESSION_TIMEOUT_MINUTES = 10

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
  const addEntry = useAddIPAllowlistEntry()
  const deleteEntry = useDeleteIPAllowlistEntry()

  const [minutesInput, setMinutesInput] = useState('')
  const [timeoutSaved, setTimeoutSaved] = useState(false)

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

  return (
    <div className="min-h-screen bg-pa-bg">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Card className="border-pa-border shadow-none">
          <CardHeader>
            <CardTitle className="font-extrabold tracking-tight">Session Timeout Platform Admin</CardTitle>
            <CardDescription>
              Berlaku untuk SEMUA akun Platform Admin. Sesi tidak diperpanjang oleh aktivitas (non-sliding) --
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
              Opsional, khusus akun Anda sendiri. Kosong berarti login diperbolehkan dari IP mana pun.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              {settings.data && settings.data.ip_allowlist.length === 0 && (
                <p className="text-sm text-text-muted">Belum ada entry -- login tidak dibatasi IP.</p>
              )}
              {settings.data && settings.data.ip_allowlist.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="py-2 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">CIDR</th>
                      <th className="py-2 pr-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.data.ip_allowlist.map((entry) => (
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
            </div>
          </CardContent>
        </Card>
      </div>
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
