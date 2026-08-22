import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useCancelInvitation,
  usePendingInvitations,
  useResendInvitation,
} from '@/features/workspace-members/hooks'
import type { PendingInvitation } from '@/features/workspace-members/types'
import { useUIStore } from '@/store/useUIStore'
import { cn } from '@/lib/utils'

// S2-28, US-006. "Status chip (pending/accepted/cancelled)" dari task
// disederhanakan jadi PENDING vs KEDALUWARSA -- accepted/cancelled TIDAK
// pernah muncul di sini (GET .../invitations cuma kembalikan baris yang
// masih pending, lihat InvitationRepository.ListPending), jadi satu-satunya
// distinction yang berarti secara visual adalah lewat/belum expires_at.
export function PendingInvitationsSection({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, isError } = usePendingInvitations(workspaceId)
  const cancelInvitation = useCancelInvitation(workspaceId)
  const resendInvitation = useResendInvitation(workspaceId)
  const showToast = useUIStore((state) => state.showToast)

  if (isLoading) return null
  if (isError) return <p className="text-sm text-destructive">Gagal memuat undangan pending.</p>
  if (!data || data.length === 0) return null

  const handleCancel = (invitation: PendingInvitation) => {
    cancelInvitation.mutate(invitation.id, {
      onSuccess: () => showToast(`Undangan untuk ${invitation.email} dibatalkan.`),
      onError: () => showToast('Gagal membatalkan undangan.'),
    })
  }

  const handleResend = (invitation: PendingInvitation) => {
    resendInvitation.mutate(invitation.id, {
      onSuccess: () => showToast(`Email undangan untuk ${invitation.email} terkirim ulang.`),
      onError: () => showToast('Gagal mengirim ulang undangan.'),
    })
  }

  return (
    <Card className="border-line bg-transparent shadow-none">
      <CardHeader className="border-b border-line pb-3">
        <CardTitle className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
          <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr_1fr] gap-3">
            <span>Undangan Pending</span>
            <span>Role</span>
            <span>Status</span>
            <span>Kedaluwarsa</span>
            <span>Aksi</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.map((invitation) => {
          const expired = new Date(invitation.expires_at) < new Date()
          return (
            <div
              key={invitation.id}
              className="grid grid-cols-[1.8fr_1fr_1fr_1fr_1fr] items-center gap-3 border-t border-line px-4 py-3"
            >
              <div className="truncate text-[13px] text-text-body">{invitation.email}</div>
              <span className="w-fit border border-line-strong px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-text-body">
                {invitation.role.replace('_', ' ')}
              </span>
              <span
                className={cn(
                  'w-fit border px-1.5 py-0.5 font-mono text-[8.5px] uppercase',
                  expired ? 'border-amber text-amber' : 'border-line-subtle text-text-muted',
                )}
              >
                {expired ? 'Kedaluwarsa' : 'Pending'}
              </span>
              <span className="font-mono text-[10px] text-text-muted">
                {new Date(invitation.expires_at).toLocaleDateString('id-ID')}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => handleResend(invitation)}
                  disabled={resendInvitation.isPending}
                  className="font-mono text-[10px] text-text-muted hover:text-signal"
                >
                  ↻ Kirim Ulang
                </button>
                <button
                  onClick={() => handleCancel(invitation)}
                  disabled={cancelInvitation.isPending}
                  className="font-mono text-[10px] text-text-muted hover:text-destructive"
                >
                  ✕ Batalkan
                </button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
