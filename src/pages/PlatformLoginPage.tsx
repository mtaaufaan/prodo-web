import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { useCompletePlatformMfaSetup, usePlatformLogin } from '@/features/platform-auth/hooks'
import { isMfaSetupRequired, platformLoginFormSchema, type PlatformLoginFormValues } from '@/features/platform-auth/types'

// S4P-19 (implementation_gaps.md IG-20): halaman login KHUSUS Platform
// Admin, terpisah dari /login member/GA biasa -- visual "restricted zone"
// (accent destructive/merah, bukan signal/mint) menandai zona akses
// ter-privilese tertinggi di sistem, sesuai konsep
// `docs/Prodo Desain/PRODO Alur Platform Admin - Standalone.html`. Tidak
// ada file `.dc.html` per-layar untuk screen ini di project Claude Design
// (dikonfirmasi tidak ada saat S4 kickoff) -- token warna/layout di bawah
// diturunkan dari `Login.tsx` yang sudah dicocokkan desain, cuma diganti
// aksen warnanya, BUKAN diklaim sebagai replikasi pixel-perfect dari
// sumber desain manapun.
//
// Memakai endpoint /auth/login yang SAMA dengan Login.tsx (bukan endpoint
// baru) -- cuma UI dan routing yang beda, sesuai keputusan di
// s4-kickoff.html Risiko & Mitigasi (hindari dua jalur validasi credential
// yang berbeda perilaku).
type Step = 'credentials' | 'mfa-setup' | 'backup-codes'

export default function PlatformLoginPage() {
  const navigate = useNavigate()
  const login = usePlatformLogin()
  const completeMfaSetup = useCompletePlatformMfaSetup()

  const [step, setStep] = useState<Step>('credentials')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [setupChallenge, setSetupChallenge] = useState<{ qrUrl: string; secret: string; email: string } | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  // Konsisten dengan ActivateMfaSetup.tsx (onboarding GA, S1-11) -- wajib
  // konfirmasi sebelum lanjut, bukan sekadar tampilan.
  const [savedAck, setSavedAck] = useState(false)
  // MFA SUDAH aktif (login kedua dst) -- beda dari step 'mfa-setup' yang
  // cuma untuk login PERTAMA. Sama pola dengan Login.tsx (mfaRequired).
  const [loginMfaRequired, setLoginMfaRequired] = useState(false)
  const [loginOtpCode, setLoginOtpCode] = useState('')
  const [loginOtpWasWrong, setLoginOtpWasWrong] = useState(false)

  const form = useForm<PlatformLoginFormValues>({
    resolver: zodResolver(platformLoginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmitCredentials = (values: PlatformLoginFormValues) => {
    setPassword(values.password)
    const alreadyPromptedForOtp = loginMfaRequired
    login.mutate(
      { email: values.email, password: values.password, mfaCode: loginOtpCode },
      {
        onSuccess: (result) => {
          if (isMfaSetupRequired(result)) {
            setSetupChallenge({ qrUrl: result.totp_qr_url, secret: result.totp_secret, email: result.email })
            setStep('mfa-setup')
          } else {
            navigate('/platform/group-admins')
          }
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'INVALID_OTP') {
            setLoginMfaRequired(true)
            setLoginOtpWasWrong(alreadyPromptedForOtp)
          }
        },
      },
    )
  }

  const onSubmitOtp = () => {
    if (!setupChallenge) return
    completeMfaSetup.mutate(
      { email: setupChallenge.email, password, otpCode },
      {
        onSuccess: (result) => {
          setBackupCodes(result.backup_codes)
          setStep('backup-codes')
        },
      },
    )
  }

  const loginApiError = login.error instanceof ApiError ? login.error : null
  // Sama pola Login.tsx: percobaan PERTAMA yang dibalas INVALID_OTP bukan
  // error sungguhan, cuma prompt "sekarang masukkan OTP" -- baru jadi
  // pesan error kalau OTP yang diketik user sendiri ternyata salah.
  const isPendingLoginOtpPrompt = loginApiError?.code === 'INVALID_OTP' && !loginOtpWasWrong
  const loginError = isPendingLoginOtpPrompt ? null : loginApiError?.message ?? null
  const setupError = completeMfaSetup.error instanceof ApiError ? completeMfaSetup.error.message : null

  return (
    <div className="grid min-h-screen bg-bg-deep md:grid-cols-[1.7fr_1fr]">
      {/* Panel branding -- restricted-zone: accent destructive, bukan
          signal/mint seperti Login.tsx, penanda visual zona ter-privilese
          tertinggi. */}
      <div
        className="hidden flex-col justify-between border-line p-11 text-text-bone md:flex md:border-r"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0, transparent 40px, oklch(0.19 0.02 25) 40px, oklch(0.19 0.02 25) 41px)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center bg-destructive font-sans text-[17px] font-black text-bg-deep">
            P
          </div>
          <span className="font-mono text-[10px] tracking-[0.2em] text-text-muted">PRODO · PLATFORM CONSOLE</span>
        </div>

        <div>
          <div className="mb-3 inline-block border border-destructive px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-destructive">
            ⚠ Restricted Zone
          </div>
          <h1 className="text-[38px] font-extrabold uppercase leading-[1.08] tracking-[-0.03em]">
            Platform
            <br />
            Admin
            <br />
            Access
          </h1>
          <p className="mt-4 max-w-[300px] text-sm leading-relaxed text-text-muted">
            Akses lintas-organisasi penuh -- kelola Group Admin, tier layanan, kuota storage, dan audit trail
            seluruh platform. MFA wajib, tanpa pengecualian.
          </p>
        </div>

        <p className="font-mono text-[9.5px] tracking-[0.14em] text-text-faint">
          SETIAP LOGIN TERCATAT DI PLATFORM AUDIT TRAIL
        </p>
      </div>

      <div className="relative flex items-center justify-center p-6">
        <div className="mb-6 flex items-center gap-2 self-start md:hidden">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-destructive font-sans text-[12px] font-black text-bg-deep">
            P
          </div>
          <span className="font-mono text-[10px] tracking-[0.14em] text-text-dim">PRODO · PLATFORM</span>
        </div>

        <div className="w-full max-w-[352px]">
          <p className="font-mono text-[10px] tracking-[0.14em] text-destructive">Platform Admin</p>
          <h2 className="mt-1 text-xl font-bold text-text-bone">
            {step === 'credentials' && 'Masuk ke Platform Console'}
            {step === 'mfa-setup' && 'Setup MFA Wajib'}
            {step === 'backup-codes' && 'Simpan Kode Cadangan'}
          </h2>

          {step === 'credentials' && (
            <form onSubmit={form.handleSubmit(onSubmitCredentials)} className="mt-5 space-y-[10px]">
              <div>
                <Label htmlFor="email" className="mb-2 block text-[9.5px] tracking-[0.14em] text-text-dim">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  disabled={loginMfaRequired}
                  aria-invalid={Boolean(form.formState.errors.email)}
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="mt-2 text-[11px] text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="mb-2 block text-[9.5px] tracking-[0.14em] text-text-dim">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  disabled={loginMfaRequired}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="mt-2 text-[11px] text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              {loginMfaRequired && (
                <div>
                  <Label htmlFor="loginOtpCode" className="mb-2 block text-[9.5px] tracking-[0.14em] text-text-dim">
                    Kode OTP
                  </Label>
                  <Input
                    id="loginOtpCode"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                    className="text-center font-mono tracking-[0.3em]"
                    value={loginOtpCode}
                    onChange={(e) => setLoginOtpCode(e.target.value)}
                  />
                </div>
              )}

              {loginError && <p className="text-[11px] text-destructive">{loginError}</p>}

              <Button
                type="submit"
                variant="destructive"
                className="w-full font-mono text-[11px] font-bold tracking-[0.1em]"
                disabled={login.isPending}
              >
                {login.isPending ? 'Memproses...' : loginMfaRequired ? 'Verifikasi & Masuk' : 'Masuk'}
              </Button>

              <p className="font-mono text-[9px] leading-[1.7] text-text-faint">
                Bukan Platform Admin? Gunakan <a href="/login" className="text-signal">halaman login biasa</a>.
              </p>
            </form>
          )}

          {step === 'mfa-setup' && setupChallenge && (
            <div className="mt-5 space-y-[10px]">
              <p className="text-[12.5px] text-text-muted">
                Akun ini belum punya MFA aktif -- wajib disetel sebelum lanjut. Pindai QR di bawah dengan aplikasi
                authenticator (Google Authenticator, Authy, dst).
              </p>
              <img src={setupChallenge.qrUrl} alt="QR code setup MFA" className="mx-auto h-40 w-40 border border-line" />
              <p className="text-center font-mono text-[10.5px] tracking-[0.08em] text-text-muted">
                Kunci manual: {setupChallenge.secret}
              </p>

              <div>
                <Label htmlFor="otpCode" className="mb-2 block text-[9.5px] tracking-[0.14em] text-text-dim">
                  Kode OTP
                </Label>
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

              {setupError && <p className="text-[11px] text-destructive">{setupError}</p>}

              <Button
                type="button"
                variant="destructive"
                className="w-full font-mono text-[11px] font-bold tracking-[0.1em]"
                disabled={completeMfaSetup.isPending || otpCode.length !== 6}
                onClick={onSubmitOtp}
              >
                {completeMfaSetup.isPending ? 'Memverifikasi...' : 'Aktifkan MFA & Masuk'}
              </Button>
            </div>
          )}

          {step === 'backup-codes' && (
            <div className="mt-5 space-y-[10px]">
              <p className="text-[12.5px] text-text-muted">
                Simpan 10 kode cadangan ini di tempat aman -- masing-masing hanya bisa dipakai sekali kalau
                authenticator app hilang. Kode ini TIDAK akan ditampilkan lagi.
              </p>
              <div className="grid grid-cols-2 gap-2 border border-line p-3 font-mono text-[12px] tracking-[0.05em] text-text-body">
                {backupCodes.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 font-mono text-[10.5px] leading-relaxed text-text-muted">
                <input
                  type="checkbox"
                  checked={savedAck}
                  onChange={(e) => setSavedAck(e.target.checked)}
                  className="mt-0.5 accent-destructive"
                />
                <span>Saya sudah menyimpan kode cadangan di tempat aman.</span>
              </label>

              <Button
                type="button"
                variant="destructive"
                className="w-full font-mono text-[11px] font-bold tracking-[0.1em]"
                disabled={!savedAck}
                onClick={() => navigate('/platform/group-admins')}
              >
                Lanjut ke Console
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
