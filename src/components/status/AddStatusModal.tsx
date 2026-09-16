import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { useCreateCustomStatus, useWorkspaceStatuses } from '@/features/tasks/hooks'
import { CUSTOM_STATUS_COLORS, statusColorClasses, type CustomStatusColorToken } from '@/features/tasks/types'
import { cn } from '@/lib/utils'

// AddStatusModal (S4W-05, "AW Add Status.dc.html") -- tambah status baru ke
// TEMPLATE workspace (US-020). Cuma berlaku untuk project yang dibuat
// SETELAH disimpan -- project yang sudah ada tidak terpengaruh (non-
// retroaktif, sama seperti field lain di ManageProjectModal). Modal
// create -> tutup begitu sukses (TIDAK butuh pola dirty/saved notice,
// beda dari panel Kelola -- lihat memory feedback_change_notice_manage_vs_create).
interface AddStatusModalProps {
  workspaceId: string
  open: boolean
  onClose: () => void
}

export default function AddStatusModal({ workspaceId, open, onClose }: AddStatusModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<CustomStatusColorToken>('signal')
  const [position, setPosition] = useState('')
  const [error, setError] = useState('')
  const statuses = useWorkspaceStatuses(workspaceId)
  const createStatus = useCreateCustomStatus(workspaceId)

  const list = statuses.data ?? []

  useEffect(() => {
    if (open) {
      setName('')
      setColor('signal')
      setPosition(String(list.length + 1))
      setError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const draftKey = name.trim().toUpperCase()
  const pos = Math.max(1, Math.min(parseInt(position, 10) || list.length + 1, list.length + 1))
  const preview = [...list]
  if (draftKey) preview.splice(pos - 1, 0, { id: '__draft', name: draftKey, color_token: color } as (typeof list)[number])

  const handleSave = () => {
    setError('')
    createStatus.mutate(
      { name: draftKey, color_token: color, position: pos },
      {
        onSuccess: onClose,
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal menambah status.'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Tambah Status ke Template Workspace</DialogTitle>
          <div className="mt-1.5 font-mono text-[10.5px] text-text-muted">
            Status ini menjadi bagian template untuk project yang dibuat setelah disimpan. Project yang sudah ada tidak
            terpengaruh, dan Project Manager tetap dapat menyesuaikan status di level project masing-masing.
          </div>
          {error && (
            <div className="mt-2.5 border border-destructive px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">
              ⚠ {error}
            </div>
          )}
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="flex gap-3.5">
            <div className="flex-[2]">
              <Label htmlFor="add-status-name" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                Nama Status
              </Label>
              <Input
                id="add-status-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MENUNGGU VENDOR"
                className="font-mono uppercase tracking-[0.04em]"
              />
              <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-text-dim">
                Huruf kapital, 3-24 karakter. Tidak boleh sama dengan status yang sudah ada.
              </p>
            </div>
            <div className="w-[130px]">
              <Label htmlFor="add-status-position" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                Posisi Urutan
              </Label>
              <Input
                id="add-status-position"
                value={position}
                onChange={(e) => setPosition(e.target.value.replace(/[^0-9]/g, ''))}
                className="font-mono"
              />
              <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-text-dim">Urutan di board Kanban.</p>
            </div>
          </div>

          <div>
            <Label className="mb-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Warna Penanda</Label>
            <div className="flex flex-wrap gap-2">
              {CUSTOM_STATUS_COLORS.map((c) => {
                const cls = statusColorClasses(c.key)
                const active = color === c.key
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setColor(c.key)}
                    className={cn(
                      'flex items-center gap-1.5 border px-2.5 py-2 font-mono text-[9px] tracking-[0.06em]',
                      active ? `${cls.border} ${cls.text}` : 'border-line-strong text-text-muted',
                    )}
                  >
                    <span className={cn('h-2.5 w-2.5', cls.dot)} />
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border border-line p-3.5">
            <div className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Pratinjau Kolom Board</div>
            <div className="flex flex-wrap items-center gap-2">
              {preview.map((p, i) => {
                const cls = statusColorClasses(p.color_token)
                const isDraft = p.id === '__draft'
                return (
                  <span
                    key={i}
                    className={cn('border px-2 py-1 font-mono text-[9.5px] font-semibold tracking-[0.06em]', cls.border, cls.text, !isDraft && 'opacity-60')}
                  >
                    {p.name}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
          <Button onClick={handleSave} disabled={createStatus.isPending} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            {createStatus.isPending ? 'Menyimpan...' : 'Simpan Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
