import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { ActivationSplitLayout, ActivationStepIndicator } from '@/components/shared/ActivationSplitLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api'
import { useVerifyMfa } from '@/features/activation/hooks'
import { mfaVerifyFormSchema, type MfaVerifyFormValues } from '@/features/activation/types'

// S1-11, US-073: langkah 2 aktivasi -- scan QR TOTP, verifikasi OTP pertama,
// lalu simpan kode cadangan. Dicocokkan dari "Set Password.dc.html" (dibaca
// via DesignSync) -- termasuk langkah "Simpan kode cadangan" yang sebelumnya
// terlewat sepenuhnya (backend juga belum pernah menerbitkannya, lihat
// S1-06/07 gap yang diperbaiki bersamaan).
interface LocationState {
  qrUrl?: string
  totpSecret?: string
  email?: string
  displayName?: string
}

function ActivateMfaSetupPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const token = searchParams.get('token') ?? ''
  const state = (location.state as LocationState | null) ?? {}
  const { qrUrl, totpSecret, email, displayName } = state

  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [savedAck, setSavedAck] = useState(false)

  const form = useForm<MfaVerifyFormValues>({
    resolver: zodResolver(mfaVerifyFormSchema),
    defaultValues: { otpCode: '' },
  })

  const verifyMfa = useVerifyMfa()

  const onSubmit = (values: MfaVerifyFormValues) => {
    verifyMfa.mutate(
      { token, otpCode: values.otpCode },
      {
        onSuccess: (result) => setBackupCodes(result.backup_codes),
      },
    )
  }

  const infoRows = email
    ? [
        { label: 'AKUN', value: displayName || '-' },
        { label: 'EMAIL', value: email },
        { label: 'ROLE', value: 'Group Admin' },
        { label: 'TAUTAN', value: 'AKTIVASI · BERLAKU 72 JAM' },
      ]
    : []

  if (!token) {
    return (
      <ActivationSplitLayout heroTitle="Buat Password Anda" heroBody="Link aktivasi tidak lengkap.">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">Link Tidak Valid</p>
        <h2 className="mt-1 text-xl font-bold text-text-bone">Token tidak ditemukan</h2>
      </ActivationSplitLayout>
    )
  }

  // ponytail: QR/secret cuma tersedia lewat router state dari halaman
  // /activate -- tidak bisa di-fetch ulang (secret TOTP sengaja tidak pernah
  // dikembalikan API dalam bentuk plaintext di luar respons pertama ini).
  // Kalau state hilang (refresh/navigasi langsung), arahkan user mulai dari
  // /activate lagi.
  if (!qrUrl) {
    return (
      <ActivationSplitLayout heroTitle="Buat Password Anda" heroBody="Sesi setup MFA tidak ditemukan.">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">QR Code Tidak Tersedia</p>
        <h2 className="mt-1 text-xl font-bold text-text-bone">Mulai lagi dari email aktivasi</h2>
      </ActivationSplitLayout>
    )
  }

  const apiErrorMessage = verifyMfa.error instanceof ApiError ? verifyMfa.error.message : null

  if (backupCodes) {
    return (
      <ActivationSplitLayout heroTitle="Buat Password Anda" heroBody="MFA aktif." infoRows={infoRows}>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mint">MFA Aktif</p>
        <h2 className="mt-1 text-xl font-bold text-text-bone">Simpan kode cadangan</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-text-muted">
          Sepuluh kode sekali pakai untuk masuk bila perangkat authenticator hilang. Kode ini hanya ditampilkan
          sekali.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border border-line bg-input-bg p-3.5 font-mono text-[11.5px] tracking-[0.08em] text-text-bone">
          {backupCodes.map((code) => (
            <div key={code}>{code}</div>
          ))}
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 font-mono text-[10.5px] leading-relaxed text-text-muted">
          <input
            type="checkbox"
            checked={savedAck}
            onChange={(e) => setSavedAck(e.target.checked)}
            className="mt-0.5 accent-signal"
          />
          <span>Saya sudah menyimpan kode cadangan di tempat aman.</span>
        </label>

        <Button
          type="button"
          disabled={!savedAck}
          onClick={() => navigate('/login', { state: { message: 'Akun berhasil diaktifkan. Silakan login.' } })}
          className="mt-4 w-full font-mono text-[11px] font-bold tracking-[0.1em]"
        >
          Selesai & Masuk
        </Button>
      </ActivationSplitLayout>
    )
  }

  return (
    <ActivationSplitLayout
      heroTitle="Buat Password Anda"
      heroBody="Akun Anda sudah didaftarkan oleh Platform Admin. Setel password sekali untuk mengaktifkan akun dan masuk ke PRODO."
      infoRows={infoRows}
    >
      <ActivationStepIndicator step={2} />

      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">Wajib · Tidak Dapat Dilewati</p>
      <h2 className="mt-1 text-xl font-bold text-text-bone">Aktifkan Multi-Factor Auth</h2>
      <p className="mt-2 text-[12.5px] leading-relaxed text-text-muted">
        Pindai kode di bawah dengan authenticator app (Google Authenticator, Microsoft Authenticator, 1Password),
        lalu masukkan 6 digit kode untuk konfirmasi.
      </p>

      <div className="mt-4 flex items-stretch gap-3.5">
        <img src={qrUrl} alt="QR code setup MFA" className="h-[132px] w-[132px] shrink-0 border border-line-strong" />
        <div className="flex flex-1 flex-col justify-center gap-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Atau Masukkan Kunci Manual</p>
          <p className="break-all border border-line bg-input-bg p-2.5 font-mono text-[11.5px] tracking-[0.12em] text-text-body">
            {totpSecret}
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
        {apiErrorMessage && <p className="text-[10.5px] text-destructive">⚠ {apiErrorMessage}</p>}

        <Input
          id="otpCode"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          aria-invalid={Boolean(form.formState.errors.otpCode)}
          className="text-center font-mono text-2xl tracking-[0.4em]"
          placeholder="000000"
          {...form.register('otpCode')}
        />
        {form.formState.errors.otpCode && (
          <p className="text-[11px] text-destructive">{form.formState.errors.otpCode.message}</p>
        )}

        <Button
          type="submit"
          className="w-full font-mono text-[11px] font-bold tracking-[0.1em]"
          disabled={verifyMfa.isPending}
        >
          {verifyMfa.isPending ? 'Memverifikasi...' : 'Verifikasi & Aktifkan MFA'}
        </Button>
      </form>
    </ActivationSplitLayout>
  )
}

function ActivateMfaSetup() {
  return (
    <ErrorBoundary>
      <ActivateMfaSetupPage />
    </ErrorBoundary>
  )
}

export default ActivateMfaSetup
