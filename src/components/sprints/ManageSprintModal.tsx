import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDeleteSprint, useUpdateSprint } from '@/features/tasks/hooks'
import type { Sprint } from '@/features/tasks/types'
import { ApiError } from '@/lib/api'

interface ManageSprintModalProps {
  sprint: Sprint | null
  onClose: () => void
}

const STATUS_LABEL: Record<Sprint['status'], string> = { active: 'AKTIF', backlog: 'BACKLOG', done: 'SELESAI' }

function addDaysISO(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// toDateInput -- backend mengembalikan start_date/end_date sebagai RFC3339
// penuh (mis. "2026-09-01T00:00:00Z", lihat sprintJSON serialisasi
// *time.Time apa adanya), sementara <input type="date"> butuh persis
// "YYYY-MM-DD" -- tanpa ini field tampak tidak terbinding (pola sama
// ManageProjectModal.tsx untuk project.end_date).
function toDateInput(iso: string | null) {
  return iso ? iso.slice(0, 10) : ''
}

// ManageSprintModal -- belum ada di desain (diminta user langsung: "buatkan
// kelola sprint PM, karena belum ada didesain. jika judul sprint di klik
// maka akan masuk ke form kelola sprint yang berupa pop up"). Dibangun
// mengikuti pola "Kelola X" existing (ManageProjectModal/
// ManageWorkspaceModal): notice/error di header (tetap terlihat saat body
// discroll), field draft + dirty-check + "Simpan Perubahan", seksi hapus
// terpisah dengan konfirmasi ketik nama persis. useUpdateSprint/
// useDeleteSprint SUDAH ADA di backend+hooks sejak IG-92 tapi belum pernah
// disambungkan ke UI manapun -- modal ini murni FE, tidak ada perubahan
// backend. Status TIDAK diubah dari sini (tombol Mulai/Tutup/Buka Kembali
// tetap di SprintCard) -- cuma ditampilkan sebagai info baca-saja.
export default function ManageSprintModal({ sprint, onClose }: ManageSprintModalProps) {
  const [name, setName] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [goal, setGoal] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const prevSprintIdRef = useRef<string | null>(null)

  const updateSprint = useUpdateSprint(sprint?.project_id ?? '')
  const deleteSprint = useDeleteSprint(sprint?.project_id ?? '')

  useEffect(() => {
    if (sprint) {
      setName(sprint.name)
      setStart(toDateInput(sprint.start_date))
      setEnd(toDateInput(sprint.end_date))
      setGoal(sprint.goal ?? '')
      setConfirmText('')
      setError('')
      // notice HANYA direset saat ganti sprint (bukan setiap refetch) --
      // pola sama ManageProjectModal/ManageWorkspaceModal, mencegah
      // invalidateQueries setelah Simpan Perubahan langsung menghapus
      // notice yang baru saja di-set.
      if (prevSprintIdRef.current !== sprint.id) setNotice('')
      prevSprintIdRef.current = sprint.id
    } else {
      prevSprintIdRef.current = null
    }
  }, [sprint])

  if (!sprint) return null

  const canDelete = confirmText.trim() === sprint.name
  const dirty =
    name.trim() !== sprint.name ||
    start !== toDateInput(sprint.start_date) ||
    end !== toDateInput(sprint.end_date) ||
    goal.trim() !== (sprint.goal ?? '')

  const applyPreset = (days: number) => {
    const base = start || new Date().toISOString().slice(0, 10)
    setStart(base)
    setEnd(addDaysISO(base, days))
  }

  const handleSave = () => {
    setError('')
    if (!name.trim()) {
      setError('Nama sprint wajib diisi.')
      return
    }
    if (!start || !end) {
      setError('Tanggal mulai dan selesai wajib diisi.')
      return
    }
    if (end < start) {
      setError('Tanggal selesai tidak boleh sebelum tanggal mulai.')
      return
    }
    updateSprint.mutate(
      { sprintId: sprint.id, values: { name: name.trim(), start_date: start, end_date: end, goal: goal.trim() || undefined } },
      {
        onSuccess: () => setNotice('Perubahan tersimpan. Tercatat di audit trail.'),
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal menyimpan perubahan.'),
      },
    )
  }

  const handleDelete = () => {
    if (!canDelete) return
    deleteSprint.mutate(sprint.id, { onSuccess: onClose, onError: () => setError('Gagal menghapus sprint.') })
  }

  return (
    <Dialog open={Boolean(sprint)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kelola Sprint</DialogTitle>
          <div className="mt-1.5 font-mono text-[10.5px] text-text-muted">
            Kode {sprint.code} · Status {STATUS_LABEL[sprint.status]} · dibuat {new Date(sprint.created_at).toLocaleDateString('id-ID')}
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
          <div>
            <Label htmlFor="manage-sprint-name" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              Nama Sprint
            </Label>
            <Input id="manage-sprint-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="manage-sprint-code" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              Kode Sprint
            </Label>
            <Input id="manage-sprint-code" value={sprint.code} readOnly className="font-mono uppercase tracking-[0.04em] opacity-70" />
            <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-text-dim">
              Dipakai kolom <span className="text-text-muted">sprint</span> pada import CSV task untuk menunjuk sprint ini. Kode dibuat otomatis dan tidak dapat diubah.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="min-w-[150px] flex-1">
              <Label htmlFor="manage-sprint-start" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                Tanggal Mulai
              </Label>
              <Input id="manage-sprint-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="min-w-[150px] flex-1">
              <Label htmlFor="manage-sprint-end" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                Tanggal Selesai
              </Label>
              <Input id="manage-sprint-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div className="w-[120px]">
              <Label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Durasi Cepat</Label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(7)}
                  className="border border-line-strong px-2 py-2 font-mono text-[9.5px] text-text-muted hover:text-text-bone"
                >
                  1 Pekan
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(14)}
                  className="border border-line-strong px-2 py-2 font-mono text-[9.5px] text-text-muted hover:text-text-bone"
                >
                  2 Pekan
                </button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="manage-sprint-goal" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              Sprint Goal · Opsional
            </Label>
            <textarea
              id="manage-sprint-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Sasaran yang ingin dicapai pada akhir sprint..."
              className="h-[72px] w-full resize-y border border-line-strong bg-input-bg px-3 py-2.5 text-[12.5px] text-text-bone outline-none focus-visible:border-signal"
            />
          </div>

          {dirty && (
            <p className="border border-amber p-2 font-mono text-[10px] leading-relaxed text-amber">
              Ada perubahan yang belum disimpan. Tekan &quot;Simpan Perubahan&quot; untuk menerapkan.
            </p>
          )}
          <Button
            onClick={handleSave}
            disabled={updateSprint.isPending}
            className="w-fit font-mono text-[10px] uppercase tracking-[0.06em]"
          >
            {updateSprint.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>

          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-destructive">Hapus Sprint</div>
            <p className="font-mono text-[9.5px] leading-relaxed text-text-muted">
              Sprint akan dihapus permanen (tidak masuk arsip); task yang masih terkait sprint ini kembali ke backlog
              (sprint_id dikosongkan, task itu sendiri TIDAK ikut terhapus). Ketik nama sprint untuk konfirmasi.
            </p>
            <div className="flex gap-2.5">
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={sprint.name} className="flex-1" />
              <Button variant="destructive" disabled={!canDelete || deleteSprint.isPending} onClick={handleDelete}>
                Hapus Sprint
              </Button>
            </div>
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
