import { useState } from 'react'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRevokeAllSessions, useRevokeSession, useSessionList } from '@/features/sessions/hooks'
import type { SessionSummary } from '@/features/sessions/types'
import { cn } from '@/lib/utils'

// S1-31, US-004/US-005: daftar sesi aktif pengguna (docs/design.md, tab
// "Sesi & Perangkat" User Pengaturan Akun.dc.html) -- di sini dibuat sebagai
// halaman standalone /settings/sessions (bukan shell tab 5-menu penuh, lihat
// sprint_backlog.md S1-31: "Halaman `/settings/sessions`") karena tab lain
// (Profil, Workspace & Role, Notifikasi) butuh backend yang belum dibangun
// di S1. Tombol revoke (S1-36) wired ke DELETE /auth/sessions/:jti dan
// DELETE /auth/sessions (S1-33/34, H10).
function formatRelative(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1) return 'baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour} jam lalu`
  return `${Math.round(diffHour / 24)} hari lalu`
}

type PendingConfirm = { kind: 'single'; jti: string; label: string } | { kind: 'all' } | null

function SessionsPageContent() {
  const { data, isLoading, isError } = useSessionList()
  const revokeSession = useRevokeSession()
  const revokeAll = useRevokeAllSessions()
  const [pending, setPending] = useState<PendingConfirm>(null)
  const others = (data ?? []).filter((s) => !s.is_current).length

  const closeDialog = () => setPending(null)

  const confirmAction = () => {
    if (!pending) return
    if (pending.kind === 'single') {
      revokeSession.mutate(pending.jti, { onSuccess: closeDialog })
    } else {
      revokeAll.mutate(undefined, { onSuccess: closeDialog })
    }
  }

  const isConfirming = pending?.kind === 'single' ? revokeSession.isPending : revokeAll.isPending

  return (
    <div className="min-h-screen bg-bg-deep">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <h1 className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">Sesi & Perangkat</h1>

        {isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
        {isError && <p className="text-sm text-destructive">Gagal memuat daftar sesi.</p>}

        {data && (
          <>
            <div className="flex flex-wrap gap-3">
              <StatCard label="SESI AKTIF" value={String(data.length)} className="text-text-bone" />
              <StatCard
                label="PERANGKAT LAIN"
                value={String(others)}
                className={others ? 'text-amber' : 'text-mint'}
              />
              <StatCard label="IDLE TIMEOUT" value="30 MNT" className="text-text-bone" />
            </div>

            <Card className="border-line bg-transparent shadow-none">
              <CardHeader className="border-b border-line pb-3">
                <CardTitle className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                  <div className="grid grid-cols-[2fr_1.2fr_1fr_0.8fr] gap-3">
                    <span>Perangkat</span>
                    <span>IP</span>
                    <span>Aktivitas</span>
                    <span>Aksi</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.length === 0 && <p className="p-4 text-sm text-text-muted">Tidak ada sesi aktif.</p>}
                {data.map((session) => (
                  <SessionRow
                    key={session.jti}
                    session={session}
                    onRevoke={() =>
                      setPending({
                        kind: 'single',
                        jti: session.jti,
                        label: `${session.device_info.browser} · ${session.device_info.os}`,
                      })
                    }
                  />
                ))}
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                disabled={others === 0}
                onClick={() => setPending({ kind: 'all' })}
                className="border-red font-mono text-[10px] uppercase tracking-[0.06em] text-red hover:bg-red/10 hover:text-red disabled:opacity-40"
              >
                Akhiri Semua Sesi Lain
              </Button>
              <p className="font-mono text-[9px] leading-relaxed text-text-dim">
                Sesi JWT memakai sliding expiration; idle 30 menit mengakhiri sesi otomatis.
              </p>
            </div>
          </>
        )}
      </div>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.kind === 'single' ? 'Akhiri Sesi' : 'Akhiri Semua Sesi Lain'}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {pending?.kind === 'single'
              ? `Sesi di perangkat "${pending.label}" akan diakhiri. Perangkat tersebut perlu login ulang.`
              : `${others} sesi di perangkat lain akan diakhiri. Sesi ini (perangkat yang sedang Anda pakai) tidak terpengaruh.`}
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              className="font-mono text-[10px] uppercase tracking-[0.06em]"
            >
              Batal
            </Button>
            <Button
              onClick={confirmAction}
              disabled={isConfirming}
              className="bg-red font-mono text-[10px] uppercase tracking-[0.06em] text-bg-deep hover:bg-red/90"
            >
              {isConfirming ? 'Memproses...' : 'Konfirmasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-[150px] flex-1 border border-line bg-panel p-[13px_15px]">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted">{label}</div>
      <div className={cn('mt-[5px] text-[20px] font-extrabold', className)}>{value}</div>
    </div>
  )
}

function SessionRow({ session, onRevoke }: { session: SessionSummary; onRevoke: () => void }) {
  return (
    <div className="grid grid-cols-[2fr_1.2fr_1fr_0.8fr] items-center gap-3 border-t border-line px-4 py-3">
      <div>
        <div className="text-[13px] text-text-body">
          {session.device_info.browser} · {session.device_info.os}
        </div>
        <div className={cn('mt-1 font-mono text-[8.5px]', session.is_current ? 'text-mint' : 'text-text-muted')}>
          {session.is_current ? 'PERANGKAT INI · SESI AKTIF' : 'SESI TERSIMPAN'}
        </div>
      </div>
      <span className="font-mono text-[10px] text-text-muted">{session.device_info.ip}</span>
      <span className="font-mono text-[10px] text-text-muted">
        {session.is_current ? 'sesi aktif' : formatRelative(session.last_active_at)}
      </span>
      {session.is_current ? (
        <span className="font-mono text-[9px] text-text-dim">SESI INI</span>
      ) : (
        <button
          onClick={onRevoke}
          className="w-fit font-mono text-[10px] text-red hover:text-red/80"
        >
          ⏻ Akhiri
        </button>
      )}
    </div>
  )
}

export default function SessionsPage() {
  return (
    <ErrorBoundary>
      <SessionsPageContent />
    </ErrorBoundary>
  )
}
