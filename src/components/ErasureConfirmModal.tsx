import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const CONFIRMATION_PHRASE = 'KONFIRMASI'

// ErasureConfirmModal -- S4P-31, US-060. Desain "PA Erasure Confirm" cuma
// modal 1 klik untuk mode execute -- AC backend (sprint_backlog.md S4P-31)
// eksplisit minta konfirmasi DUA LANGKAH untuk aksi pseudonymization yang
// irreversible ini (lihat implementation_gaps.md untuk gap desain-vs-AC),
// jadi langkah kedua (ketik "KONFIRMASI") ditambahkan di atas modal desain
// asli. Mode reject TETAP 1 klik seperti desain -- reversibel secara data
// (cuma ubah status), risikonya jauh lebih rendah.
export default function ErasureConfirmModal({
  open,
  mode,
  subject,
  onClose,
  onConfirm,
  isPending,
  errorMessage,
}: {
  open: boolean
  mode: 'execute' | 'reject'
  subject: string
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
  errorMessage: string | null
}) {
  const [typed, setTyped] = useState('')
  const isExecute = mode === 'execute'
  const canConfirm = isExecute ? typed === CONFIRMATION_PHRASE : true

  const handleClose = () => {
    setTyped('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose()
      }}
    >
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            {isExecute ? 'Konfirmasi Right to Erasure' : 'Batalkan Permintaan Erasure'}
          </DialogTitle>
        </DialogHeader>

        <p className="text-[13px] leading-relaxed text-text-body">
          {isExecute ? 'Eksekusi penghapusan data untuk' : 'Batalkan permintaan penghapusan data untuk'}{' '}
          <b className="text-text-bone">{subject}</b>?
        </p>
        <p className="font-mono text-[9.5px] leading-relaxed text-text-dim">
          {isExecute
            ? 'Tindakan ini melakukan pseudonymization pada data akun (identitas → token anonim), merevoke seluruh sesi aktif, dan menghapus MFA. Tidak dapat dibatalkan.'
            : 'Permintaan ditolak dan tidak akan diproses. Pemohon akan diberi tahu. Tindakan tercatat di audit trail.'}
        </p>

        {isExecute && (
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="erasure-confirm-input" className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
              Ketik &quot;{CONFIRMATION_PHRASE}&quot; untuk melanjutkan
            </Label>
            <Input
              id="erasure-confirm-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="font-mono"
            />
          </div>
        )}

        {errorMessage && <p className="font-mono text-[11px] text-destructive">{errorMessage}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Keluar
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={!canConfirm || isPending}>
            {isPending ? 'Memproses...' : isExecute ? 'Ya, Eksekusi' : 'Ya, Batalkan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
