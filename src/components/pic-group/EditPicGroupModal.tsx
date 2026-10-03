import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { PicGroupRow } from '@/features/pic-groups/rows'
import type { ProjectMember } from '@/features/project-members/types'
import { cn } from '@/lib/utils'

// Warna avatar -- palet desain "PM PIC Group.dc.html" (AV).
const AVATAR_COLORS = [
  'oklch(0.75 0.15 55)',
  'oklch(0.78 0.12 165)',
  'oklch(0.72 0.15 320)',
  'oklch(0.72 0.12 240)',
  'oklch(0.78 0.16 75)',
]

// Role yang TIDAK tampil sama sekali (desain: Admin Workspace bukan pelaksana
// task); Viewer tampil tapi dinonaktifkan. Backend menolak keduanya (422
// PIC_GROUP_MEMBER_INELIGIBLE) -- ini hanya mencerminkan aturannya di UI.
const HIDDEN_ROLES = ['admin_workspace', 'division_viewer']

function roleLabel(role: string): string {
  return role.toUpperCase().replace(/_/g, ' ')
}

interface EditPicGroupModalProps {
  row: PicGroupRow | null
  projectName: string
  roster: ProjectMember[]
  saving: boolean
  error: string
  onSave: (userIds: string[]) => void
  onClear: () => void
  onClose: () => void
}

// EditPicGroupModal -- "PM PIC Group.dc.html" modal ✎ ATUR: siapa yang boleh
// menjadi PIC di satu status. SIMPAN mengganti seluruh set; KOSONGKAN = Full
// handoff untuk semua role.
export default function EditPicGroupModal({ row, projectName, roster, saving, error, onSave, onClear, onClose }: EditPicGroupModalProps) {
  const candidates = roster.filter((m) => !HIDDEN_ROLES.includes(m.role) && !m.is_pending)
  const [draft, setDraft] = useState<string[]>([])

  useEffect(() => {
    if (!row) return
    const selectable = new Set(candidates.filter((m) => m.role !== 'viewer').map((m) => m.user_id))
    setDraft(row.members.map((m) => m.userId).filter((id) => selectable.has(id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset SEKALI saat status yang diatur berganti
  }, [row?.statusId])

  const toggle = (userId: string) =>
    setDraft((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))

  return (
    <Dialog open={row !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[620px]">
        <DialogHeader>
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-signal">PIC GROUP · {row?.name}</div>
          <DialogTitle>Siapa yang boleh menjadi PIC di status ini</DialogTitle>
          <p className="mt-1.5 font-mono text-[9px] leading-[1.7] text-text-dim">
            Kosongkan untuk mengizinkan Full handoff oleh seluruh role. Project {projectName}.
          </p>
          {error && (
            <div className="mt-2.5 border border-destructive px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">⚠ {error}</div>
          )}
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-300px)] flex-col gap-2 overflow-y-auto px-5 py-4">
          {candidates.length === 0 && (
            <p className="py-6 text-center font-mono text-[10.5px] text-text-dim">Project ini belum punya member yang dapat menjadi PIC.</p>
          )}
          {candidates.map((m, i) => {
            const viewer = m.role === 'viewer'
            const on = !viewer && draft.includes(m.user_id)
            const name = m.display_name || m.email
            return (
              <button
                key={m.user_id}
                type="button"
                disabled={viewer}
                onClick={() => toggle(m.user_id)}
                aria-pressed={on}
                className={cn(
                  'flex items-center gap-[11px] border px-3 py-2.5 text-left',
                  on ? 'border-signal bg-signal/10' : 'border-line',
                  viewer && 'cursor-not-allowed opacity-45',
                )}
              >
                <span
                  className={cn(
                    'grid h-4 w-4 flex-shrink-0 place-items-center border text-[10px] text-bg-deep',
                    on ? 'border-signal bg-signal' : viewer ? 'border-line' : 'border-line-strong',
                  )}
                >
                  {on ? '✓' : ''}
                </span>
                <span
                  className="grid h-6 w-6 flex-shrink-0 place-items-center font-mono text-[9.5px] font-bold text-bg-deep"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {name
                    .split(/\s+/)
                    .map((w) => w[0] ?? '')
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 leading-[1.3]">
                  <span className="block truncate text-[12.5px] text-text-bone">{name}</span>
                  <span className="mt-0.5 block truncate font-mono text-[9px] text-text-dim">
                    {m.email}
                    {viewer && <span className="text-amber"> · TIDAK DAPAT MENJADI PIC</span>}
                  </span>
                </span>
                <span className="border border-line px-[7px] py-[3px] font-mono text-[8.5px] tracking-[0.06em] text-text-muted">{roleLabel(m.role)}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2.5 border-t border-line px-5 py-4">
          <Button
            onClick={() => onSave(draft)}
            disabled={saving}
            className="bg-signal font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-bg-deep hover:bg-signal-hover"
          >
            {saving ? 'Menyimpan...' : 'Simpan PIC Group'}
          </Button>
          <Button variant="outline" onClick={onClear} disabled={saving} className="font-mono text-[10.5px] uppercase tracking-[0.06em]">
            Kosongkan
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={saving} className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.06em] text-text-muted">
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
