import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { useLogin } from '@/features/auth/hooks'
import { loginFormSchema, type LoginFormValues } from '@/features/auth/types'

// S1-22/24, US-001: halaman /login -- form credential lokal + step MFA.
// Tombol SSO ("CONTINUE WITH SSO", ghost button per docs/design.md §8)
// sengaja NON-FUNGSIONAL -- desain-only sampai design_gaps.md DG-01 (mode
// SSO vs credential lokal tidak boleh tampil bersamaan) resolved dan
// S1-19/23 (handler + FE callback SSO, saat ini pending) selesai.
export default function Login() {
  const navigate = useNavigate()
  const login = useLogin()
  const [mfaRequired, setMfaRequired] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  // Bedakan "baru pertama kali diminta OTP" (bukan error, sekadar prompt)
  // dari "OTP yang diketik salah" (error sungguhan) -- backend membalas
  // kode INVALID_OTP yang SAMA untuk keduanya, jadi front-end yang perlu
  // melacak state ini sendiri.
  const [otpWasWrong, setOtpWasWrong] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = (values: LoginFormValues) => {
    const alreadyOnMfaStep = mfaRequired
    login.mutate(
      { email: values.email, password: values.password, mfaCode: otpCode },
      {
        onSuccess: () => navigate('/'),
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'INVALID_OTP') {
            setMfaRequired(true)
            setOtpWasWrong(alreadyOnMfaStep)
          }
        },
      },
    )
  }

  const apiError = login.error instanceof ApiError ? login.error : null
  const isPendingOtpPrompt = apiError?.code === 'INVALID_OTP' && !otpWasWrong
  const errorMessage = isPendingOtpPrompt ? null : apiError?.message

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-deep p-6">
      <Card className="w-full max-w-md border-line shadow-none">
        <CardHeader>
          <CardTitle className="font-extrabold tracking-tight">Masuk ke PRODO</CardTitle>
          <CardDescription>
            {mfaRequired ? 'Masukkan kode OTP dari aplikasi authenticator Anda.' : 'Masuk dengan email dan password.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                disabled={mfaRequired}
                aria-invalid={Boolean(form.formState.errors.email)}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-[11px] text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                disabled={mfaRequired}
                aria-invalid={Boolean(form.formState.errors.password)}
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-[11px] text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            {mfaRequired && (
              <div className="space-y-2">
                <Label htmlFor="otpCode">Kode OTP</Label>
                <Input
                  id="otpCode"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  className="text-center font-mono tracking-[0.3em]"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
              </div>
            )}

            {errorMessage && <p className="text-[11px] text-destructive">{errorMessage}</p>}

            <Button
              type="submit"
              className="w-full font-mono text-[11px] uppercase tracking-[0.08em]"
              disabled={login.isPending}
            >
              {login.isPending ? 'Memproses...' : mfaRequired ? 'Verifikasi & Masuk' : 'Masuk'}
            </Button>

            <div className="relative py-2 text-center">
              <span className="bg-raised px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                atau
              </span>
              <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-line" />
            </div>

            <Button
              type="button"
              variant="outline"
              disabled
              title="Login SSO belum tersedia -- menunggu konfigurasi SSO per organisasi (design_gaps.md DG-01)"
              className="w-full border-line-strong font-mono text-[11px] uppercase tracking-[0.08em]"
            >
              Lanjutkan dengan SSO
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
