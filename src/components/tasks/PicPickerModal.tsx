import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ProjectMember } from '@/features/project-members/types'
import { cn } from '@/lib/utils'

// PicPickerModal (Track S5, menu Board) -- dipakai drag-drop Kanban lintas
// kolom DAN bulk action ("PINDAHKAN & TETAPKAN PIC"), reuse pola PIC
// picker TaskDetailModal.tsx (pilih dari SELURUH member project, backend
// yang menolak lewat PIC_NOT_IN_GROUP kalau perlu -- tidak ada filter PIC
// Group di klien, sama seperti modal Task Detail).
interface PicPickerModalProps {
  open: boolean
  title: string
  note: string
  members: ProjectMember[]
  onConfirm: (picIds: string[]) => void
  onCancel: () => void
  isPending: boolean
  errorMessage: string
}

export default function PicPickerModal({ open, title, note, members, onConfirm, onCancel, isPending, errorMessage }: PicPickerModalProps) {
  const [picked, setPicked] = useState<string[]>([])

  useEffect(() => {
    if (open) setPicked([])
  }, [open])

  const toggle = (userId: string) => {
    setPicked((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <div className="mt-1.5 text-[13px] text-text-muted">{note}</div>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-2 overflow-y-auto px-5 py-5">
          {errorMessage && (
            <div className="mb-2 border border-destructive px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">⚠ {errorMessage}</div>
          )}
          {members.map((m) => {
            const on = picked.includes(m.user_id)
            return (
              <button
                key={m.user_id}
                type="button"
                onClick={() => toggle(m.user_id)}
                className={cn('flex items-center gap-3 border px-3 py-2.5 text-left', on ? 'border-signal bg-accent-wash' : 'border-line')}
              >
                <span className={cn('font-mono text-[12px]', on ? 'text-signal' : 'text-text-muted')}>{on ? '☑' : '☐'}</span>
                <span className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] text-text-body">{m.display_name || m.email}</div>
                  <div className="truncate font-mono text-[9px] text-text-muted">{m.email}</div>
                </span>
              </button>
            )
          })}
          {members.length === 0 && <p className="font-mono text-[10px] text-text-muted">Belum ada member di project ini.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Batal
          </Button>
          <Button onClick={() => onConfirm(picked)} disabled={picked.length === 0 || isPending} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            {isPending ? 'Memproses...' : 'Pindahkan & Tetapkan PIC'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
