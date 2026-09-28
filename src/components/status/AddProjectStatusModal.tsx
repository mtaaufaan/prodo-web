import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { useCreateProjectCustomStatus, useProjectStatuses } from '@/features/tasks/hooks'
import { CUSTOM_STATUS_COLORS, statusColorClasses, type CustomStatusColorToken } from '@/features/tasks/types'
import { cn } from '@/lib/utils'

// AddProjectStatusModal (Track S5B, US-019, "PM Add Status.dc.html") --
// tambah status baru KE PROJECK INI (bukan template workspace) -- langsung
// tersedia untuk semua task project ini, project lain di workspace TIDAK
// terpengaruh (versi project dari AddStatusModal.tsx).
interface AddProjectStatusModalProps {
  projectId: string
  projectName: string
  open: boolean
  onClose: () => void
}

export default function AddProjectStatusModal({ projectId, projectName, open, onClose }: AddProjectStatusModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<CustomStatusColorToken>('signal')
  const [position, setPosition] = useState('')
  const [error, setError] = useState('')
  const statuses = useProjectStatuses(projectId)
  const createStatus = useCreateProjectCustomStatus(projectId)

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
          <DialogTitle>Tambah Status di Project Ini</DialogTitle>
          <div className="mt-1.5 font-mono text-[10.5px] text-text-muted">{projectName}</div>
          <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-text-dim">
            Status baru langsung tersedia untuk semua task di project ini dan tidak mempengaruhi project lain di
            workspace (US-019).
          </p>
          {error && (
            <div className="mt-2.5 border border-destructive px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">
              ⚠ {error}
            </div>
          )}
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="flex gap-3.5">
            <div className="flex-[2]">
              <Label htmlFor="add-project-status-name" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                Nama Status
              </Label>
              <Input
                id="add-project-status-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MENUNGGU VENDOR"
                className="font-mono uppercase tracking-[0.04em]"
              />
              <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-text-dim">
                Huruf kapital, 3-24 karakter. Tidak boleh sama dengan status yang sudah ada di project ini.
              </p>
            </div>
            <div className="w-[130px]">
              <Label htmlFor="add-project-status-position" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                Posisi Urutan
              </Label>
              <Input
                id="add-project-status-position"
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

          <p className="font-mono text-[9.5px] leading-relaxed text-text-dim">
            Tercatat di Audit Trail workspace: aktor, waktu, nama status, posisi, dan project yang terdampak. Status
            baru tersedia sebagai trigger rule level project segera setelah disimpan.
          </p>
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
