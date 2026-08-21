import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { useLogin } from '@/features/auth/hooks'
import { loginFormSchema, type LoginFormValues } from '@/features/auth/types'

// S1-22/24, US-001: halaman /login -- layout split-screen (panel branding +
// form) sesuai docs/Prodo Desain/PRODO Alur Aplikasi - Standalone.html
// (screen "LOGIN -- SSO GATE"), bukan card tunggal ala Activate.tsx.
//
// 3 tombol SSO per-provider (Microsoft/Okta/Google) DITAMPILKAN sesuai
// prototipe (dikonfirmasi user), tapi disabled -- desain-only, belum
// fungsional sampai design_gaps.md DG-01 (mode SSO vs credential lokal)
// resolved dan S1-19/23 (masih pending) selesai. Ukuran/tracking/urutan
// (SSO dulu, baru form lokal) dicocokkan lewat inspeksi computed style
// prototipe langsung, bukan dari deskripsi tertulis design.md.
//
// Perbedaan yang SENGAJA tidak direplikasi:
// - Copy "5x gagal -> lockout 15 menit" & "tercatat di audit trail" -> tidak
//   dimasukkan, karena lockout dan audit log percobaan GAGAL belum
//   diimplementasikan backend (lihat gap S1-20 di docs/s1-kickoff.html).
//   Menampilkannya akan mengklaim fitur yang belum ada.
// - Link "LUPA PASSWORD?" dan "BELUM PUNYA PASSWORD? ..." -> tidak ada
//   endpoint/flow-nya (akun GA diundang, bukan self-signup); dihilangkan
//   daripada jadi link mati.
// - Toggle bahasa ID/EN -> di luar scope S1-22.
// - Ikon brand asli Microsoft/Okta/Google -> tidak disertakan (aset
//   trademark, bukan bagian dari design token PRODO); tombol berupa teks.
const SSO_PROVIDERS = ['Microsoft', 'Okta', 'Google']

const FEATURE_BADGES = [
  'RBAC 7-ROLE · AUDIT TRAIL IMMUTABLE',
  'AES-256 AT REST · TLS 1.3 IN TRANSIT',
  'DATA RESIDENSI · ASIA TENGGARA',
  'SOC 2 · SAML 2.0 / OIDC · WCAG 2.1 AA',
]

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center bg-signal font-mono font-black text-bg-deep"
      style={{ width: size, height: size, fontSize: size * 0.46 }}
    >
      P
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const login = useLogin()
  const [mfaRequired, setMfaRequired] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="grid min-h-screen bg-bg-deep md:grid-cols-[1.7fr_1fr]">
      {/* Panel branding -- disembunyikan di mobile, cuma tampil >= md */}
      <div className="hidden flex-col justify-between p-12 md:flex">
        <div className="flex items-center gap-2">
          <LogoMark />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">PRODO · OPS LEDGER</span>
        </div>

        <div>
          <h1 className="text-[44px] font-extrabold uppercase leading-[1.05] text-primary">
            Delivery
            <br />
            Control
            <br />
            Console
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Boards, timelines, sprints, dan workload untuk setiap workspace -- satu instrumen operasional untuk
            &gt;10.000 pengguna enterprise.
          </p>
        </div>

        <div className="space-y-1.5">
          {FEATURE_BADGES.map((badge) => (
            <p key={badge} className="font-mono text-[10.5px] uppercase tracking-[0.03em] text-text-dim">
              {badge}
            </p>
          ))}
        </div>
      </div>

      {/* Panel form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-[352px]">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <LogoMark size={24} />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">PRODO</span>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">Masuk ke PRODO</p>
          <h2 className="mt-1 text-xl font-bold text-primary">
            {mfaRequired ? 'Verifikasi MFA' : 'Selamat datang kembali'}
          </h2>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-2.5">
              {SSO_PROVIDERS.map((provider) => (
                <Button
                  key={provider}
                  type="button"
                  variant="outline"
                  disabled={mfaRequired}
                  title="Login SSO belum tersedia -- menunggu konfigurasi SSO per organisasi (design_gaps.md DG-01)"
                  className="w-full border-line-strong font-mono text-[11px] font-normal uppercase tracking-[0.04em]"
                >
                  Masuk dengan {provider}
                </Button>
              ))}
            </div>

            <div className="relative py-1 text-center">
              <span className="relative bg-bg-deep px-2 font-mono text-[9px] uppercase tracking-[0.08em] text-text-dim">
                atau
              </span>
              <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-line" />
            </div>

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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={mfaRequired}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  className="pr-9"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-text-dim hover:text-text-body"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
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
              className="w-full font-mono text-[11px] font-bold uppercase tracking-[0.1em]"
              disabled={login.isPending}
            >
              {login.isPending ? 'Memproses...' : mfaRequired ? 'Verifikasi & Masuk' : 'Masuk'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
