import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ImportConfirmDialogProps {
  open: boolean
  kind: 'sprint' | 'task'
  /** Nama project tujuan -- ditampilkan besar di tengah supaya salah project mudah ketahuan. */
  projectName: string
  fileName: string
  validCount: number
  skippedCount: number
  onClose: () => void
  onConfirm: () => void
}

// ImportConfirmDialog -- konfirmasi sebelum "Jalankan Import" di pratinjau
// (diminta user setelah import task salah project). Import tidak bisa
// dibatalkan otomatis, jadi project tujuan dibuat paling menonjol.
export default function ImportConfirmDialog({ open, kind, projectName, fileName, validCount, skippedCount, onClose, onConfirm }: ImportConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Jalankan import?</DialogTitle>
        </DialogHeader>

        <p className="text-[13px] leading-relaxed text-text-body">Data hasil import {kind} akan ditulis ke project:</p>

        <div className="border border-signal bg-signal/10 px-4 py-4 text-center">
          <div className="font-mono text-[9px] tracking-[0.16em] text-text-dim">PROJECT TUJUAN</div>
          <div className="mt-1.5 break-words text-[22px] font-extrabold leading-tight text-signal">{projectName || 'Memuat nama project…'}</div>
        </div>

        <div className="space-y-1 text-center">
          <p className="text-[13px] text-text-bone">
            <b className="text-mint">{validCount}</b> {kind} akan dibuat
          </p>
          {skippedCount > 0 && (
            <p className="text-[13px] text-text-bone">
              <b className="text-amber">{skippedCount}</b> baris dilewati dan tidak diimpor
            </p>
          )}
          <p className="truncate font-mono text-[9.5px] text-text-dim">Berkas: {fileName}</p>
        </div>

        <p className="font-mono text-[9.5px] leading-relaxed text-text-dim">
          Import tidak dapat dibatalkan otomatis; data yang salah harus dihapus manual. Pastikan project di atas sudah benar sebelum melanjutkan.
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" onClick={onConfirm} disabled={!projectName}>
            Ya, Jalankan Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
