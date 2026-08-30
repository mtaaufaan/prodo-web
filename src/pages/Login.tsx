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

// S1-22/24, US-001: halaman /login -- dicocokkan LANGSUNG dari source asli
// "Login.dc.html" (dibaca via DesignSync dari project Claude Design user,
// bukan reverse-engineer dari file export statis) -- nilai pixel/warna di
// bawah ini persis dari sana, bukan perkiraan.
//
// Sengaja TIDAK direplikasi:
// - "TYPE / Archivo · Plex Mono" swatch panel + judul "LOGIN -- SSO GATE" di
//   atas kartu -> itu chrome dokumentasi milik tool desain (anotasi
//   untuk reviewer desain), bukan bagian UI produk yang sesungguhnya.
// - Ikon brand asli Microsoft/Okta/Google -> kotak warna solid (persis
//   seperti source-nya sendiri -- source JUGA pakai kotak warna, bukan
//   logo asli, jadi ini bukan penyederhanaan, memang begitu desainnya).
const SSO_PROVIDERS = [
  { name: 'Microsoft', color: 'oklch(0.72 0.13 200)' },
  { name: 'Okta', color: 'oklch(0.72 0.15 320)' },
  { name: 'Google', color: 'oklch(0.78 0.16 75)' },
] as const

function LogoMark({ size }: { size: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center bg-signal font-sans font-black text-bg-deep"
      style={{ width: size, height: size, fontSize: size === 34 ? 17 : 12 }}
    >
      P
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 font-mono text-[9px] uppercase tracking-[0.08em] text-text-dim">
      <div className="h-px flex-1 bg-line" />
      {label}
      <div className="h-px flex-1 bg-line" />
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
      {/* Panel branding -- disembunyikan di mobile, cuma tampil >= md.
          Grid garis horizontal 40px + border-r: persis background-image
          repeating-linear-gradient di Login.dc.html. */}
      <div
        className="hidden flex-col justify-between border-line p-11 text-text-bone md:flex md:border-r"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0, transparent 40px, oklch(0.21 0.008 60) 40px, oklch(0.21 0.008 60) 41px)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <span className="font-mono text-[10px] tracking-[0.2em] text-text-muted">PRODO · OPS LEDGER</span>
        </div>

        <div>
          <h1 className="text-[38px] font-extrabold uppercase leading-[1.08] tracking-[-0.03em]">
            Delivery
            <br />
            Control
            <br />
            Console
          </h1>
          <p className="mt-4 max-w-[300px] text-sm leading-relaxed text-text-muted">
            Boards, timelines, sprints, dan workload untuk setiap workspace -- satu instrumen operasional untuk
            &gt;10.000 pengguna enterprise.
          </p>

          <div className="mt-5 space-y-2">
            {['RBAC 7-ROLE · AUDIT TRAIL IMMUTABLE', 'AES-256 AT REST · TLS 1.3 IN TRANSIT', 'DATA RESIDENSI · ASIA TENGGARA'].map(
              (bullet) => (
                <div key={bullet} className="flex items-center gap-2">
                  <span className="h-[7px] w-[7px] shrink-0 bg-mint" />
                  <span className="font-mono text-[10.5px] tracking-[0.05em] text-text-muted">{bullet}</span>
                </div>
              ),
            )}
          </div>
        </div>

        <p className="font-mono text-[9.5px] tracking-[0.14em] text-text-faint">SOC 2 · SAML 2.0 / OIDC · WCAG 2.1 AA</p>
      </div>

      {/* Panel form -- lebar konten 352px = 440px card - 2x44px padding di
          Login.dc.html. */}
      <div className="relative flex items-center justify-center p-6">
        <div className="mb-6 flex items-center gap-2 self-start md:hidden">
          <LogoMark size={24} />
          <span className="font-mono text-[10px] tracking-[0.14em] text-text-dim">PRODO</span>
        </div>

        {/* Toggle bahasa -- desain-only (belum wired ke i18next, halaman ini
            belum diterjemahkan; wiring i18n penuh di luar scope S1-22) */}
        <div className="absolute right-6 top-5 hidden gap-0 font-mono text-[9.5px] tracking-[0.08em] md:flex">
          <span className="border-b border-signal px-2 py-1 text-text-body">ID</span>
          <span className="border-b border-transparent px-2 py-1 text-text-dim">EN</span>
        </div>

        <div className="w-full max-w-[352px]">
          <p className="font-mono text-[10px] tracking-[0.14em] text-text-muted">Masuk ke PRODO</p>
          <h2 className="mt-1 text-xl font-bold text-text-bone">
            {mfaRequired ? 'Verifikasi MFA' : 'Selamat datang kembali'}
          </h2>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-[10px]">
            <div className="space-y-[10px]">
              {SSO_PROVIDERS.map(({ name, color }) => (
                <Button
                  key={name}
                  type="button"
                  variant="outline"
                  disabled={mfaRequired}
                  title="Login SSO belum tersedia -- menunggu konfigurasi SSO per organisasi (design_gaps.md DG-01)"
                  className="w-full justify-center gap-[9px] border-line-strong font-mono text-[11px] font-normal tracking-[0.04em] text-text-body"
                >
                  <span className="h-2 w-2 shrink-0" style={{ backgroundColor: color }} />
                  Masuk dengan {name}
                </Button>
              ))}
            </div>

            <Divider label="atau" />

            <div>
              <Label htmlFor="email" className="mb-2 block text-[9.5px] tracking-[0.14em] text-text-dim">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                disabled={mfaRequired}
                aria-invalid={Boolean(form.formState.errors.email)}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="mt-2 text-[11px] text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <Label htmlFor="password" className="text-[9.5px] tracking-[0.14em] text-text-dim">
                  Password
                </Label>
                {/* Desain-only -- belum ada endpoint reset password, sengaja
                    inert (bukan link mati ke halaman yang tidak ada). */}
                <span
                  className="cursor-default font-mono text-[9.5px] tracking-[0.04em] text-signal"
                  title="Reset password belum tersedia"
                >
                  Lupa password?
                </span>
              </div>
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
                  className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-text-muted hover:text-text-body"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="mt-2 text-[11px] text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            {mfaRequired && (
              <div>
                <Label htmlFor="otpCode" className="mb-2 block text-[9.5px] tracking-[0.14em] text-text-dim">
                  Kode OTP
                </Label>
                <Input
                  id="otpCode"
                  maxLength={9}
                  autoComplete="one-time-code"
                  autoFocus
                  className="text-center font-mono tracking-[0.3em]"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
                {/* Kode cadangan (2026-08-30, menutup gap: backup_codes
                    sudah diterbitkan sejak awal tapi tidak ada jalur
                    memakainya saat login) -- format "XXXX-XXXX" diterima
                    di kotak yang sama, dibedakan backend lewat ada/tidaknya
                    strip (lihat mfa.go isBackupCodeFormat). */}
                <p className="mt-1.5 text-[10.5px] text-text-dim">
                  Kehilangan HP authenticator? Gunakan salah satu dari 10 kode cadangan Anda (format XXXX-XXXX).
                </p>
              </div>
            )}

            {errorMessage && <p className="text-[11px] text-destructive">{errorMessage}</p>}

            <Button
              type="submit"
              className="w-full font-mono text-[11px] font-bold tracking-[0.1em]"
              disabled={login.isPending}
            >
              {login.isPending ? 'Memproses...' : mfaRequired ? 'Verifikasi & Masuk' : 'Masuk'}
            </Button>

            {/* Copy asli Login.dc.html -- lockout & audit trail percobaan
                gagal belum diimplementasikan backend (gap S1-20, lihat
                docs/s1-kickoff.html); teks tetap ditampilkan sesuai desain,
                gap-nya dicatat terpisah bukan dengan mengubah copy produk
                secara sepihak. */}
            <p className="font-mono text-[9px] leading-[1.7] text-text-faint">
              Seluruh percobaan login tercatat di audit trail (IP, perangkat, timestamp). 5x gagal → lockout 15
              menit.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
