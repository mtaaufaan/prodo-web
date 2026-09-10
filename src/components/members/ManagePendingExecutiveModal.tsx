import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateExecutiveInvitationIdentity } from '@/features/members/hooks'
import type { PendingGroupMember } from '@/features/members/types'
import { ApiError } from '@/lib/api'

interface ManagePendingExecutiveModalProps {
  pending: PendingGroupMember | null
  groupId: string
  onClose: () => void
}

// ManagePendingExecutiveModal (Members & Roles, permintaan user 2026-09-10)
// -- "Kelola" untuk undangan Eksekutif yang MASIH PENDING (belum aktivasi).
// Beda dari ManageMemberModal (member sudah punya akun): cuma isi Nama +
// Jabatan, tidak ada role/akses (belum ada user_id sama sekali). Alasan:
// tidak realistis meminta Direksi mengisi data ini sendiri sebelum akun
// aktif -- GA mengisikannya di sini, nilainya jadi default (tetap bisa
// diedit) di form aktivasi (AcceptInvitationPage).
export default function ManagePendingExecutiveModal({ pending, groupId, onClose }: ManagePendingExecutiveModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [title, setTitle] = useState('')
  const update = useUpdateExecutiveInvitationIdentity(groupId)

  useEffect(() => {
    if (pending) {
      setDisplayName(pending.display_name)
      setTitle(pending.title)
    }
  }, [pending])

  const handleClose = () => {
    update.reset()
    onClose()
  }

  if (!pending) return null

  const errorMessage = update.error instanceof ApiError ? update.error.message : null

  return (
    <Dialog open onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Kelola Undangan Eksekutif</DialogTitle>
          <p className="mt-1 text-sm text-text-muted">{pending.email} · belum aktivasi</p>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-5">
          <p className="text-[11px] leading-relaxed text-text-muted">
            Isikan Nama dan Jabatan atas nama Eksekutif ini sebelum akunnya aktif -- nilai ini akan tampil sebagai
            bawaan (tetap bisa diubah) di formulir aktivasi.
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="pe-name">Nama</Label>
            <Input id="pe-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="mis. Ratna Kusuma" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pe-title">Jabatan</Label>
            <Input id="pe-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Chief Operating Officer" />
          </div>
          {errorMessage && <p className="text-[11px] text-destructive">{errorMessage}</p>}
        </div>

        <DialogFooter>
          <Button
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                { invitationId: pending.id, displayName: displayName.trim(), title: title.trim() },
                { onSuccess: handleClose },
              )
            }
            className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]"
          >
            {update.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
          <Button variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
