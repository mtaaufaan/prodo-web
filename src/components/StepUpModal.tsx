import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient, ApiError } from '@/lib/api'
import { useStepUpStore } from '@/store/useStepUpStore'

// StepUpModal (S16-05, forward-pull Track S4G, desain "GA Step Up.dc.html")
// -- dipasang SEKALI di App.tsx (sama pola Toaster), dikendalikan
// useStepUpStore yang dipicu axios interceptor (src/lib/api.ts) saat
// menerima 403 STEP_UP_REQUIRED. Verifikasi sukses -> resolve() -> request
// asli otomatis di-retry oleh interceptor, modal ini tidak tahu/tidak perlu
// tahu request apa yang tertunda.
export default function StepUpModal() {
  const open = useStepUpStore((s) => s.open)
  const resolve = useStepUpStore((s) => s.resolve)
  const cancel = useStepUpStore((s) => s.cancel)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const reset = () => {
    setUseBackupCode(false)
    setCode('')
    setError(null)
    setVerifying(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset()
      cancel()
    }
  }

  const handleSubmit = async () => {
    setError(null)
    setVerifying(true)
    try {
      await apiClient.post('/api/v1/auth/step-up', { code })
      reset()
      resolve()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memverifikasi kode')
      setVerifying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Verifikasi Ulang Diperlukan</DialogTitle>
          <p className="mt-1 text-sm text-text-muted">
            Aksi ini bersifat sensitif -- masukkan kode dari aplikasi autentikator Anda untuk melanjutkan.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-5 py-5">
          <div className="grid gap-1.5">
            <Label htmlFor="step-up-code">{useBackupCode ? 'Kode cadangan' : 'Kode OTP 6-digit'}</Label>
            <Input
              id="step-up-code"
              autoFocus
              inputMode={useBackupCode ? 'text' : 'numeric'}
              maxLength={useBackupCode ? undefined : 6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !verifying && code && handleSubmit()}
              placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
            />
          </div>
          {error && <p className="text-[11px] text-destructive">{error}</p>}
          <button
            type="button"
            onClick={() => {
              setUseBackupCode((v) => !v)
              setCode('')
              setError(null)
            }}
            className="text-left font-mono text-[10.5px] tracking-[0.04em] text-signal hover:underline"
          >
            {useBackupCode ? 'Pakai kode OTP' : 'Pakai kode cadangan'}
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={verifying}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={!code || verifying}>
            {verifying ? 'Memverifikasi…' : 'Verifikasi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
