import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { useActivateAccount } from '@/features/activation/hooks'
import { activateFormSchema, type ActivateFormValues } from '@/features/activation/types'

// S1-10, US-073: langkah 1 aktivasi akun Group Admin -- set password baru.
function ActivatePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const form = useForm<ActivateFormValues>({
    resolver: zodResolver(activateFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const activate = useActivateAccount()

  const onSubmit = (values: ActivateFormValues) => {
    activate.mutate(
      { token, password: values.password },
      {
        onSuccess: (result) => {
          navigate(`/activate/mfa-setup?token=${encodeURIComponent(token)}`, {
            state: { qrUrl: result.totp_qr_url },
          })
        },
      },
    )
  }

  if (!token) {
    return (
      <PageShell>
        <CardHeader>
          <CardTitle className="font-extrabold tracking-tight">Link Tidak Valid</CardTitle>
          <CardDescription>Link aktivasi tidak lengkap -- token tidak ditemukan.</CardDescription>
        </CardHeader>
      </PageShell>
    )
  }

  const apiErrorMessage = activate.error instanceof ApiError ? activate.error.message : null

  return (
    <PageShell>
      <CardHeader>
        <CardTitle className="font-extrabold tracking-tight">Aktivasi Akun</CardTitle>
        <CardDescription>Setel password baru untuk mengaktifkan akun Group Admin Anda.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password Baru</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(form.formState.errors.password)}
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="text-[11px] text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(form.formState.errors.confirmPassword)}
              {...form.register('confirmPassword')}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-[11px] text-destructive">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          {apiErrorMessage && <p className="text-[11px] text-destructive">{apiErrorMessage}</p>}

          <Button
            type="submit"
            className="w-full font-mono text-[11px] uppercase tracking-[0.08em]"
            disabled={activate.isPending}
          >
            {activate.isPending ? 'Memproses...' : 'Lanjutkan'}
          </Button>
        </form>
      </CardContent>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-deep p-6">
      <Card className="w-full max-w-md border-line shadow-none">{children}</Card>
    </div>
  )
}

export default function Activate() {
  return (
    <ErrorBoundary>
      <ActivatePage />
    </ErrorBoundary>
  )
}
