import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { ActivationSplitLayout, ActivationStepIndicator } from '@/components/shared/ActivationSplitLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { useActivateAccount } from '@/features/activation/hooks'
import { activateFormSchema, getPasswordChecks, type ActivateFormValues } from '@/features/activation/types'

// S1-10, US-073: langkah 1 aktivasi akun Group Admin -- set password baru.
// Dicocokkan dari source asli "Set Password.dc.html" (dibaca via DesignSync)
// setelah audit menemukan versi sebelumnya (card tunggal, tanpa meter
// kekuatan/checklist/step indicator) jauh berbeda dari desain sesungguhnya.
const STRENGTH_LABELS = ['LEMAH', 'LEMAH', 'SEDANG', 'SEDANG', 'HAMPIR', 'KUAT']

function ActivatePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<ActivateFormValues>({
    resolver: zodResolver(activateFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })
  const password = form.watch('password')
  const confirmPassword = form.watch('confirmPassword')

  const activate = useActivateAccount()

  const onSubmit = (values: ActivateFormValues) => {
    activate.mutate(
      { token, password: values.password },
      {
        onSuccess: (result) => {
          navigate(`/activate/mfa-setup?token=${encodeURIComponent(token)}`, {
            state: {
              qrUrl: result.totp_qr_url,
              totpSecret: result.totp_secret,
              email: result.email,
              displayName: result.display_name,
            },
          })
        },
      },
    )
  }

  if (!token) {
    return (
      <ActivationSplitLayout heroTitle="Buat Password Anda" heroBody="Link aktivasi tidak lengkap.">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">Link Tidak Valid</p>
        <h2 className="mt-1 text-xl font-bold text-text-bone">Token tidak ditemukan</h2>
      </ActivationSplitLayout>
    )
  }

  const checks = getPasswordChecks(password)
  const passedCount = checks.filter((c) => c.ok).length
  const strengthColor = passedCount === 5 ? 'bg-mint' : passedCount > 0 ? 'bg-amber' : 'bg-raised-2'
  const strengthLabelColor = passedCount === 5 ? 'text-mint' : passedCount > 0 ? 'text-amber' : 'text-text-dim'
  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== password
  const apiErrorMessage = activate.error instanceof ApiError ? activate.error.message : null

  return (
    <ActivationSplitLayout
      heroTitle="Buat Password Anda"
      heroBody="Akun Anda sudah didaftarkan oleh Platform Admin. Setel password sekali untuk mengaktifkan akun dan masuk ke PRODO."
    >
      <ActivationStepIndicator step={1} />

      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">Aktivasi Akun</p>
      <h2 className="mt-1 text-xl font-bold text-text-bone">Buat password pertama Anda</h2>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="password" className="mb-2 block text-[9.5px] tracking-[0.14em] text-text-dim">
            Password Baru
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={Boolean(form.formState.errors.password)}
              className="pr-9"
              {...form.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-text-muted hover:text-text-body"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-1 flex-1 gap-[3px] bg-raised">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`flex-1 ${i < passedCount ? strengthColor : 'bg-raised-2'}`} />
            ))}
          </div>
          <span className={`min-w-[62px] text-right font-mono text-[9.5px] tracking-[0.1em] ${strengthLabelColor}`}>
            {password ? STRENGTH_LABELS[passedCount] : '—'}
          </span>
        </div>

        <div className="space-y-2 border border-line bg-content p-3.5">
          <p className="mb-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">Syarat Password</p>
          {checks.map((check) => {
            const touched = password.length > 0 || form.formState.isSubmitted
            const color = check.ok ? 'text-mint' : touched ? 'text-destructive' : 'text-text-dim'
            return (
              <div key={check.label} className={`flex items-start gap-2 font-mono text-[10.5px] leading-relaxed ${color}`}>
                <span className="w-3 shrink-0">{check.ok ? '✓' : touched ? '✗' : '·'}</span>
                <span>{check.label}</span>
              </div>
            )
          })}
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="mb-2 block text-[9.5px] tracking-[0.14em] text-text-dim">
            Ulangi Password
          </Label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={confirmMismatch}
            {...form.register('confirmPassword')}
          />
          {confirmMismatch && (
            <p className="mt-2 text-[10px] text-destructive">⚠ Konfirmasi password belum sama.</p>
          )}
        </div>

        {apiErrorMessage && <p className="text-[11px] text-destructive">⚠ {apiErrorMessage}</p>}

        <Button
          type="submit"
          className="w-full font-mono text-[11px] font-bold tracking-[0.1em]"
          disabled={activate.isPending}
        >
          {activate.isPending ? 'Memproses...' : 'Aktifkan Akun & Simpan'}
        </Button>

        <p className="font-mono text-[9px] leading-[1.7] text-text-faint">
          Tautan aktivasi hanya berlaku sekali dan hangus setelah password disetel. Semua percobaan tercatat di audit
          trail.
        </p>
      </form>
    </ActivationSplitLayout>
  )
}

export default function Activate() {
  return (
    <ErrorBoundary>
      <ActivatePage />
    </ErrorBoundary>
  )
}
