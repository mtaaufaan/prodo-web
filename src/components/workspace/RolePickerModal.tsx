import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ASSIGNABLE_ROLES } from '@/features/workspace-members/types'
import type { WorkspaceMember } from '@/features/workspace-members/types'
import { useUpdateMemberRole } from '@/features/workspace-members/hooks'
import { cn } from '@/lib/utils'

// S2-07, US-002 (AW Members Roles.dc.html): dropdown role + deskripsi
// singkat per role. admin_workspace SENGAJA tidak jadi opsi -- lihat
// catatan ASSIGNABLE_ROLES.
interface RolePickerModalProps {
  workspaceId: string
  workspaceName: string
  member: WorkspaceMember | null
  onClose: () => void
}

export default function RolePickerModal({ workspaceId, workspaceName, member, onClose }: RolePickerModalProps) {
  const [draftRole, setDraftRole] = useState('')
  const updateRole = useUpdateMemberRole(workspaceId)

  useEffect(() => {
    if (member) setDraftRole(member.role)
  }, [member])

  const handleSave = () => {
    if (!member || draftRole === member.role) return
    updateRole.mutate({ userId: member.user_id, role: draftRole }, { onSuccess: onClose })
  }

  return (
    <Dialog open={member !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kelola Member Workspace</DialogTitle>
          {member && (
            <div className="mt-1.5 text-[15px] font-bold text-text-bone">{member.display_name || member.email}</div>
          )}
        </DialogHeader>

        <div className="px-5 py-5">
          <label className="mb-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
            Role di Workspace {workspaceName}
          </label>
          <div className="flex flex-col border border-line">
            {ASSIGNABLE_ROLES.map((r) => {
              const active = draftRole === r.key
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setDraftRole(r.key)}
                  className={cn(
                    'flex gap-2.5 border-t border-line-subtle px-3 py-2.5 text-left first:border-t-0',
                    active && 'bg-accent-wash',
                  )}
                >
                  <span className={cn('font-mono text-[11px] leading-normal', active ? 'text-signal' : 'text-text-muted')}>
                    {active ? '◉' : '○'}
                  </span>
                  <span>
                    <div className={cn('font-mono text-[10.5px] tracking-[0.06em]', active ? 'text-signal' : 'text-text-body')}>
                      {r.label}
                    </div>
                    <div className="mt-1 text-[11.5px] text-text-muted">{r.description}</div>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 font-mono text-[9px] leading-relaxed text-text-dim">
            Perubahan role berlaku langsung tanpa member logout dan login ulang. Admin Workspace tidak dapat memberi
            atau mencabut role Admin Workspace — itu wewenang Group Admin di level organisasi.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
          <Button
            onClick={handleSave}
            disabled={!member || draftRole === member.role || updateRole.isPending}
            className="font-mono text-[10px] uppercase tracking-[0.06em]"
          >
            {updateRole.isPending ? 'Menyimpan...' : 'Simpan Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
