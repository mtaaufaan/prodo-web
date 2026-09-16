import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import {
  useMoveStatus,
  useRestoreStatus,
  useSetStatusStartConfirmation,
  useUndefineStatus,
  useUpdateStatusAppearance,
} from '@/features/tasks/hooks'
import { CUSTOM_STATUS_COLORS, normalizeStatusColor, statusColorClasses, type CustomStatus, type CustomStatusColorToken } from '@/features/tasks/types'
import { cn } from '@/lib/utils'

// UNTRACKED -- BACKLOG/DONE/BLOCKED bukan status kerja aktif, konfirmasi
// "Mulai Pengerjaan" tidak berlaku (sama konstanta dengan backend
// customStatusUntracked, dan AW Custom Status.dc.html).
const UNTRACKED = ['BACKLOG', 'DONE', 'BLOCKED']

// ManageStatusPanel (S4W-05, "AW Custom Status.dc.html" panel "KELOLA
// STATUS TEMPLATE") -- Nama+Warna pakai pola dirty/saved notice standar
// (lihat memory feedback_change_notice_manage_vs_create); Konfirmasi
// Mulai dan Zona Berbahaya (Undefine/Restore) aksi langsung terpisah
// dengan tombolnya sendiri, sama pola seksi PM ManageProjectModal --
// tidak butuh dirty check.
interface ManageStatusPanelProps {
  workspaceId: string
  status: CustomStatus | null
  onClose: () => void
}

export default function ManageStatusPanel({ workspaceId, status, onClose }: ManageStatusPanelProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<CustomStatusColorToken>('signal')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const prevStatusIdRef = useRef<string | null>(null)

  const updateAppearance = useUpdateStatusAppearance(workspaceId)
  const moveStatus = useMoveStatus(workspaceId)
  const setStartConfirmation = useSetStatusStartConfirmation(workspaceId)
  const undefineStatus = useUndefineStatus(workspaceId)
  const restoreStatus = useRestoreStatus(workspaceId)

  useEffect(() => {
    if (status) {
      setName(status.name)
      setColor(normalizeStatusColor(status.color_token))
      setError('')
      if (prevStatusIdRef.current !== status.id) setNotice('')
      prevStatusIdRef.current = status.id
    } else {
      prevStatusIdRef.current = null
    }
  }, [status])

  if (!status) return null

  const dirty = (!status.is_system && name.trim().toUpperCase() !== status.name) || color !== normalizeStatusColor(status.color_token)
  const trackable = !status.is_system || !UNTRACKED.includes(status.name)
  const startOn = status.require_start_confirmation

  const handleSave = () => {
    setError('')
    updateAppearance.mutate(
      { statusId: status.id, input: { name: name.trim().toUpperCase(), color_token: color } },
      {
        onSuccess: () => setNotice('Perubahan tersimpan pada template workspace. Tercatat di Audit Trail.'),
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal menyimpan perubahan.'),
      },
    )
  }

  const handleMove = (direction: 'up' | 'down') => {
    setError('')
    moveStatus.mutate(
      { statusId: status.id, direction },
      { onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal mengubah urutan.') },
    )
  }

  const handleToggleStart = () => {
    setError('')
    setStartConfirmation.mutate(
      { statusId: status.id, require: !startOn },
      {
        onSuccess: () => setNotice(`Konfirmasi mulai status ${status.name} ${!startOn ? 'diaktifkan' : 'dimatikan'}. Tercatat di Audit Trail.`),
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal mengubah setting.'),
      },
    )
  }

  const handleUndefine = () => {
    setError('')
    undefineStatus.mutate(status.id, {
      onSuccess: () => setNotice(`Status "${status.name}" kini UNDEFINED di template workspace. Tercatat di Audit Trail.`),
      onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal menjadikan status UNDEFINED.'),
    })
  }

  const handleRestore = () => {
    setError('')
    restoreStatus.mutate(status.id, {
      onSuccess: () => setNotice(`Status "${status.name}" aktif kembali di template.`),
      onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal memulihkan status.'),
    })
  }

  return (
    <Dialog open={Boolean(status)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Kelola Status Template</DialogTitle>
          <div className="mt-1.5 font-mono text-[10.5px] text-text-muted">
            {status.name} · {status.is_undefined ? 'UNDEFINED' : status.is_system ? 'Status sistem' : 'Status kustom workspace'} · template workspace
          </div>
          {!dirty && notice && (
            <div className="mt-2.5 border border-mint px-3.5 py-3 font-mono text-[10px] leading-relaxed text-mint">✓ {notice}</div>
          )}
          {error && (
            <div className="mt-2.5 border border-destructive px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">
              ⚠ {error}
            </div>
          )}
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Informasi Status</div>
            <div className="flex gap-3.5">
              <div className="flex-1">
                <Label htmlFor="manage-status-name" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                  Nama Status
                </Label>
                <Input
                  id="manage-status-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={status.is_system}
                  className="font-mono uppercase tracking-[0.04em] disabled:opacity-50"
                />
                <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-text-dim">
                  {status.is_system
                    ? 'Nama status sistem tidak dapat diubah; warna dan urutan tetap dapat diatur.'
                    : 'Mengubah nama hanya berlaku pada template -- project yang sudah menyalin status ini tidak berubah.'}
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-col items-center gap-1">
                <Label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Urut</Label>
                <button
                  type="button"
                  onClick={() => handleMove('up')}
                  disabled={moveStatus.isPending}
                  className="border border-line-strong px-2.5 py-1 text-text-muted hover:text-text-bone disabled:opacity-40"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => handleMove('down')}
                  disabled={moveStatus.isPending}
                  className="border border-line-strong px-2.5 py-1 text-text-muted hover:text-text-bone disabled:opacity-40"
                >
                  ▼
                </button>
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
          </div>

          {dirty && (
            <p className="border border-amber p-2 font-mono text-[10px] leading-relaxed text-amber">
              Ada perubahan yang belum disimpan. Tekan &quot;Simpan Perubahan&quot; untuk menerapkan.
            </p>
          )}
          <Button onClick={handleSave} disabled={updateAppearance.isPending} className="w-fit font-mono text-[10px] uppercase tracking-[0.06em]">
            {updateAppearance.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>

          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Status Time Tracking</div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-[360px] font-mono text-[9.5px] leading-relaxed text-text-muted">
                {!trackable
                  ? 'BACKLOG, DONE, dan BLOCKED tidak dilacak waktunya -- task di status ini menunggu keputusan, bukan sedang dikerjakan.'
                  : startOn
                    ? 'Aktif: task pada status ini menampilkan tombol "Mulai Pengerjaan". Queue Time dan Active Time dicatat terpisah.'
                    : 'Nonaktif: waktu mulai otomatis sama dengan waktu masuk status.'}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={!trackable || setStartConfirmation.isPending}
                onClick={handleToggleStart}
                className={cn(
                  'flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.06em]',
                  trackable && (startOn ? 'border-amber text-amber' : 'border-mint text-mint'),
                )}
              >
                {!trackable ? 'Tidak Berlaku' : startOn ? 'Matikan Konfirmasi' : 'Aktifkan Konfirmasi'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-destructive">Zona Berbahaya</div>
            {status.is_system ? (
              <p className="border border-line-strong p-3 font-mono text-[9.5px] leading-relaxed text-text-muted">
                Lima status sistem (BACKLOG, IN PROGRESS, UNDER REVIEW, DONE, BLOCKED) wajib ada di setiap project dan
                tidak dapat dihapus dari template.
              </p>
            ) : status.is_undefined ? (
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[9.5px] leading-relaxed text-text-muted">
                  Status ini berstatus UNDEFINED: berhenti disalin ke project baru, namun project dan task yang sudah
                  memakainya tetap utuh.
                </p>
                <Button
                  variant="outline"
                  disabled={restoreStatus.isPending}
                  onClick={handleRestore}
                  className="w-fit font-mono text-[10px] uppercase tracking-[0.06em] text-mint"
                >
                  ↺ Pulihkan ke Template
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[9.5px] leading-relaxed text-text-muted">
                  Menghapus status kustom mengubahnya menjadi UNDEFINED -- berhenti disalin ke project baru, sementara
                  project dan task yang sudah memakainya tidak berubah.
                  {status.task_count > 0 && (
                    <>
                      {' '}
                      <span className="text-amber">{status.task_count} task</span> saat ini memakai status ini.
                    </>
                  )}
                </p>
                <Button
                  variant="destructive"
                  disabled={undefineStatus.isPending}
                  onClick={handleUndefine}
                  className="w-fit font-mono text-[10px] uppercase tracking-[0.06em]"
                >
                  ⊘ Jadikan Undefined
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
