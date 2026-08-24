import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api'
import { useCreateGroupAdmin, useGroupAdminList, useResendActivation } from '@/features/platform-admin/hooks'
import { createGroupAdminSchema, type CreateGroupAdminFormValues, type GroupAdmin } from '@/features/platform-admin/types'

// S1-12, US-073: panel Platform Admin -- buat akun Group Admin + resend activation.
// Aksen `pa-accent` (bukan `signal` bawaan member app) menandai zona restricted
// sesuai docs/design.md §5B -- aksi Platform Admin sifatnya platform-wide.
function PlatformGroupAdminPageContent() {
  const list = useGroupAdminList()
  const createGroupAdmin = useCreateGroupAdmin()
  const resendActivation = useResendActivation()
  const [lastResentId, setLastResentId] = useState<string | null>(null)

  const form = useForm<CreateGroupAdminFormValues>({
    resolver: zodResolver(createGroupAdminSchema),
    defaultValues: { email: '', display_name: '', group_name: '' },
  })

  const onSubmit = (values: CreateGroupAdminFormValues) => {
    createGroupAdmin.mutate(values, { onSuccess: () => form.reset() })
  }

  const handleResend = (id: string) => {
    setLastResentId(null)
    resendActivation.mutate(id, { onSuccess: () => setLastResentId(id) })
  }

  const createErrorMessage = createGroupAdmin.error instanceof ApiError ? createGroupAdmin.error.message : null

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card className="border-pa-border shadow-none">
        <CardHeader>
          <CardTitle className="font-extrabold tracking-tight">Buat Akun Group Admin</CardTitle>
          <CardDescription>Email aktivasi berisi link one-time yang berlaku 72 jam akan dikirim.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="display_name">Nama Lengkap</Label>
              <Input id="display_name" {...form.register('display_name')} />
              {form.formState.errors.display_name && (
                <p className="text-[11px] text-destructive">{form.formState.errors.display_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-[11px] text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="group_name">Nama Perusahaan / Grup</Label>
              <Input id="group_name" {...form.register('group_name')} />
              {form.formState.errors.group_name && (
                <p className="text-[11px] text-destructive">{form.formState.errors.group_name.message}</p>
              )}
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                className="bg-pa-accent font-mono text-[11px] uppercase tracking-[0.08em] text-bg-deep hover:bg-pa-accent-hover"
                disabled={createGroupAdmin.isPending}
              >
                {createGroupAdmin.isPending ? 'Membuat...' : 'Buat Akun'}
              </Button>
            </div>
          </form>
          {createErrorMessage && <p className="mt-2 text-[11px] text-destructive">{createErrorMessage}</p>}
        </CardContent>
      </Card>

      <Card className="border-pa-border shadow-none">
        <CardHeader>
          <CardTitle className="font-extrabold tracking-tight">Daftar Group Admin</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
          {list.isError && <p className="text-sm text-destructive">Gagal memuat daftar Group Admin.</p>}
          {list.data && list.data.length === 0 && (
            <p className="text-sm text-text-muted">Belum ada Group Admin.</p>
          )}
          {list.data && list.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="py-2 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                      Nama
                    </th>
                    <th className="py-2 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                      Email
                    </th>
                    <th className="py-2 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                      Status
                    </th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((ga) => (
                    <GroupAdminRow
                      key={ga.id}
                      groupAdmin={ga}
                      onResend={handleResend}
                      isResending={resendActivation.isPending && resendActivation.variables === ga.id}
                      justResent={lastResentId === ga.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Status pill: docs/design-system.md §8.1 -- border 1px status hue, mono
// uppercase, TANPA fill (bukan badge terisi warna).
function StatusPill({ status }: { status: GroupAdmin['status'] }) {
  return (
    <span
      className={cn(
        'inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]',
        status === 'active' ? 'border-mint text-mint' : 'border-amber text-amber',
      )}
    >
      {status === 'active' ? 'Aktif' : 'Pending'}
    </span>
  )
}

function GroupAdminRow({
  groupAdmin,
  onResend,
  isResending,
  justResent,
}: {
  groupAdmin: GroupAdmin
  onResend: (id: string) => void
  isResending: boolean
  justResent: boolean
}) {
  return (
    <tr className="border-b border-line last:border-0">
      <td className="py-2 pr-4">{groupAdmin.display_name}</td>
      <td className="py-2 pr-4">{groupAdmin.email}</td>
      <td className="py-2 pr-4">
        <StatusPill status={groupAdmin.status} />
      </td>
      <td className="py-2 pr-4 text-right">
        {groupAdmin.status === 'pending' &&
          (justResent ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-mint">Terkirim</span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-line-strong font-mono text-[10px] uppercase tracking-[0.08em]"
              disabled={isResending}
              onClick={() => onResend(groupAdmin.id)}
            >
              {isResending ? 'Mengirim...' : 'Resend'}
            </Button>
          ))}
      </td>
    </tr>
  )
}

export default function PlatformGroupAdminPage() {
  return (
    <ErrorBoundary>
      <PlatformGroupAdminPageContent />
    </ErrorBoundary>
  )
}
