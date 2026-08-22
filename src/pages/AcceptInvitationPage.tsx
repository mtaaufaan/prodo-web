import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'

import { ActivationSplitLayout } from '@/components/shared/ActivationSplitLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPasswordChecks } from '@/features/activation/types'
import { useAcceptInvitation } from '@/features/invitation-accept/hooks'
import { acceptInvitationFormSchema, type AcceptInvitationFormValues } from '@/features/invitation-accept/types'
import { ApiError } from '@/lib/api'

// S2-27, US-006. Satu langkah (beda dari Activate.tsx Group Admin yang 2
// langkah + MFA wajib) -- member biasa tidak diwajibkan setup MFA
// (internal/service/invitation.go AcceptInvitation). Tidak auto-login
// setelah berhasil (API_CONTRACT.md v1.6.0) -- redirect ke /login.
const STRENGTH_LABELS = ['LEMAH', 'LEMAH', 'SEDANG', 'SEDANG', 'HAMPIR', 'KUAT']

function AcceptInvitationPageContent() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationFormSchema),
    defaultValues: { displayName: '', password: '', confirmPassword: '' },
  })
  const password = form.watch('password')
  const confirmPassword = form.watch('confirmPassword')

  const accept = useAcceptInvitation()

  const onSubmit = (values: AcceptInvitationFormValues) => {
    accept.mutate({ token, displayName: values.displayName, password: values.password })
  }

  if (!token) {
    return (
      <ActivationSplitLayout heroTitle="Terima Undangan" heroBody="Link undangan tidak lengkap.">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">Link Tidak Valid</p>
        <h2 className="mt-1 text-xl font-bold text-text-bone">Token tidak ditemukan</h2>
      </ActivationSplitLayout>
    )
  }

  if (accept.isSuccess) {
    return (
      <ActivationSplitLayout heroTitle="Terima Undangan" heroBody="Akun Anda sudah aktif.">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mint">✓ Berhasil</p>
        <h2 className="mt-1 text-xl font-bold text-text-bone">Akun {accept.data.email} aktif</h2>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Anda sudah ditambahkan ke workspace dengan role {accept.data.role}. Masuk dengan email dan password yang
          baru saja Anda buat.
        </p>
        <Link to="/login">
          <Button className="mt-5 w-full font-mono text-[11px] font-bold tracking-[0.1em]">Masuk ke PRODO</Button>
        </Link>
      </ActivationSplitLayout>
    )
  }

  const checks = getPasswordChecks(password)
  const passedCount = checks.filter((c) => c.ok).length
  const strengthColor = passedCount === 5 ? 'bg-mint' : passedCount > 0 ? 'bg-amber' : 'bg-raised-2'
  const strengthLabelColor = passedCount === 5 ? 'text-mint' : passedCount > 0 ? 'text-amber' : 'text-text-dim'
  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== password
  const apiErrorMessage = accept.error instanceof ApiError ? accept.error.message : null

  return (
    <ActivationSplitLayout
      heroTitle="Terima Undangan"
      heroBody="Anda diundang bergabung ke sebuah workspace di PRODO. Buat nama tampilan dan password untuk mengaktifkan akun."
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">Undangan Workspace</p>
      <h2 className="mt-1 text-xl font-bold text-text-bone">Buat akun Anda</h2>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="displayName" className="mb-2 block text-[9.5px] tracking-[0.14em] text-text-dim">
            Nama Tampilan
          </Label>
          <Input
            id="displayName"
            autoComplete="name"
            aria-invalid={Boolean(form.formState.errors.displayName)}
            {...form.register('displayName')}
          />
          {form.formState.errors.displayName && (
            <p className="mt-2 text-[10px] text-destructive">⚠ {form.formState.errors.displayName.message}</p>
          )}
        </div>

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
          {confirmMismatch && <p className="mt-2 text-[10px] text-destructive">⚠ Konfirmasi password belum sama.</p>}
        </div>

        {apiErrorMessage && <p className="text-[11px] text-destructive">⚠ {apiErrorMessage}</p>}

        <Button type="submit" className="w-full font-mono text-[11px] font-bold tracking-[0.1em]" disabled={accept.isPending}>
          {accept.isPending ? 'Memproses...' : 'Aktifkan Akun'}
        </Button>

        <p className="font-mono text-[9px] leading-[1.7] text-text-faint">
          Tautan undangan hanya berlaku sekali dan hangus setelah akun dibuat. Semua percobaan tercatat di audit
          trail.
        </p>
      </form>
    </ActivationSplitLayout>
  )
}

export default function AcceptInvitationPage() {
  return (
    <ErrorBoundary>
      <AcceptInvitationPageContent />
    </ErrorBoundary>
  )
}
