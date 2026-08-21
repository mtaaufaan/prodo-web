import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { useVerifyMfa } from '@/features/activation/hooks'
import { mfaVerifyFormSchema, type MfaVerifyFormValues } from '@/features/activation/types'

interface LocationState {
  qrUrl?: string
}

// S1-11, US-073: langkah 2 aktivasi -- scan QR TOTP, verifikasi OTP pertama.
function ActivateMfaSetupPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const token = searchParams.get('token') ?? ''
  const qrUrl = (location.state as LocationState | null)?.qrUrl

  const form = useForm<MfaVerifyFormValues>({
    resolver: zodResolver(mfaVerifyFormSchema),
    defaultValues: { otpCode: '' },
  })

  const verifyMfa = useVerifyMfa()

  const onSubmit = (values: MfaVerifyFormValues) => {
    verifyMfa.mutate(
      { token, otpCode: values.otpCode },
      {
        onSuccess: () => {
          navigate('/login', { state: { message: 'Akun berhasil diaktifkan. Silakan login.' } })
        },
      },
    )
  }

  if (!token) {
    return (
      <PageShell>
        <CardHeader>
          <CardTitle>Link Tidak Valid</CardTitle>
          <CardDescription>Link aktivasi tidak lengkap -- token tidak ditemukan.</CardDescription>
        </CardHeader>
      </PageShell>
    )
  }

  // ponytail: QR cuma tersedia lewat router state dari halaman /activate --
  // tidak bisa di-fetch ulang (secret TOTP sengaja tidak pernah dikembalikan
  // API dalam bentuk plaintext). Kalau state hilang (refresh/navigasi
  // langsung), arahkan user mulai dari /activate lagi.
  if (!qrUrl) {
    return (
      <PageShell>
        <CardHeader>
          <CardTitle>QR Code Tidak Tersedia</CardTitle>
          <CardDescription>
            Silakan mulai lagi dari link aktivasi di email Anda untuk melihat QR code setup MFA.
          </CardDescription>
        </CardHeader>
      </PageShell>
    )
  }

  const apiErrorMessage = verifyMfa.error instanceof ApiError ? verifyMfa.error.message : null

  return (
    <PageShell>
      <CardHeader>
        <CardTitle>Setup MFA</CardTitle>
        <CardDescription>
          Scan QR code ini dengan aplikasi authenticator (Google Authenticator, Authy, dsb.), lalu masukkan kode 6
          digit yang muncul.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <img src={qrUrl} alt="QR code setup MFA" className="mx-auto h-56 w-56" />

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otpCode">Kode OTP</Label>
            <Input
              id="otpCode"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              {...form.register('otpCode')}
            />
            {form.formState.errors.otpCode && (
              <p className="text-sm text-destructive">{form.formState.errors.otpCode.message}</p>
            )}
          </div>

          {apiErrorMessage && <p className="text-sm text-destructive">{apiErrorMessage}</p>}

          <Button type="submit" className="w-full" disabled={verifyMfa.isPending}>
            {verifyMfa.isPending ? 'Memverifikasi...' : 'Verifikasi & Aktifkan Akun'}
          </Button>
        </form>
      </CardContent>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">{children}</Card>
    </div>
  )
}

export default function ActivateMfaSetup() {
  return (
    <ErrorBoundary>
      <ActivateMfaSetupPage />
    </ErrorBoundary>
  )
}
