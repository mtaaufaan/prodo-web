import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRemoveProjectMember, useUpdateProjectMemberRole } from '@/features/project-members/hooks'
import { PROJECT_SCOPED_ROLES, type ProjectMember } from '@/features/project-members/types'
import { cn } from '@/lib/utils'

interface ManageProjectMemberPanelProps {
  projectId: string
  projectName: string
  target: ProjectMember | null
  onClose: () => void
}

// ManageProjectMemberPanel (IG-97 susulan, desain "PM Member Project.dc.html"
// panel "KELOLA MEMBER PROJECT") -- pola sama ManageMemberPanel.tsx
// (workspace) tapi tanpa dropdown pindah project (halaman ini sudah
// terikat SATU project lewat URL). Setiap baris di sini DIJAMIN
// project_scoped_role murni (editor/approver/viewer) -- PM/AW tidak
// pernah muncul lewat ListMembers biasa (lihat komentar backend
// ProjectMemberRepository.ListAssignableMembers), jadi TIDAK ADA baris
// "terkunci" seperti versi workspace.
export default function ManageProjectMemberPanel({ projectId, projectName, target, onClose }: ManageProjectMemberPanelProps) {
  const [draftRole, setDraftRole] = useState('')
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [saveNotice, setSaveNotice] = useState('')
  const prevUserIdRef = useRef<string | null>(null)
  const updateRole = useUpdateProjectMemberRole(projectId)
  const removeMember = useRemoveProjectMember(projectId)

  useEffect(() => {
    if (target) {
      setDraftRole(target.role)
      if (prevUserIdRef.current !== target.user_id) setSaveNotice('')
      prevUserIdRef.current = target.user_id
    } else {
      prevUserIdRef.current = null
    }
    setConfirmingRemove(false)
  }, [target])

  if (!target) return null
  const displayName = target.display_name || target.email
  const dirty = draftRole !== target.role

  const handleSaveRole = () => {
    updateRole.mutate(
      { userId: target.user_id, role: draftRole },
      { onSuccess: () => setSaveNotice(`Role diubah ${target.role.toUpperCase()} → ${draftRole.toUpperCase()}. Berlaku hanya di project ini; role di workspace tidak berubah. Tercatat di Audit Trail.`) },
    )
  }

  const handleRemove = () => {
    removeMember.mutate(target.user_id, { onSuccess: onClose })
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-signal">Kelola Member Project</div>
          <DialogTitle className="mt-1.5 text-[15px] font-bold text-text-bone">{displayName}</DialogTitle>
          <div className="mt-1 font-mono text-[9.5px] text-text-muted">{target.email}</div>
          <div className="mt-1.5 font-mono text-[9px] leading-relaxed text-text-dim">
            Role workspace {target.workspace_role?.toUpperCase() ?? '—'} · role di project ini {target.role.toUpperCase()} ·{' '}
            {target.is_scoped ? 'project-scoped, ditambahkan Project Manager' : 'akses mengikuti role workspace'} · bergabung{' '}
            {new Date(target.added_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          {(updateRole.error || removeMember.error) && (
            <div className="border border-destructive px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">
              ⚠ Gagal menyimpan perubahan.
            </div>
          )}

          <div>
            <label className="mb-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Role di Project Ini</label>
            <div className="flex flex-col border border-line">
              {PROJECT_SCOPED_ROLES.map((r) => {
                const active = draftRole === r.key
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => { setDraftRole(r.key); setSaveNotice('') }}
                    className={cn('flex gap-2.5 border-t border-line-subtle px-3 py-2.5 text-left first:border-t-0', active && 'bg-accent-wash')}
                  >
                    <span className={cn('font-mono text-[11px] leading-normal', active ? 'text-signal' : 'text-text-muted')}>{active ? '◉' : '○'}</span>
                    <span>
                      <div className={cn('font-mono text-[10.5px] tracking-[0.06em]', active ? 'text-signal' : 'text-text-body')}>{r.label}</div>
                      <div className="mt-1 text-[11.5px] text-text-muted">{r.description}</div>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-text-dim">
              Project Manager hanya dapat memberi role Editor, Approver, atau Viewer. Role Project Manager dan Admin Workspace ditetapkan Admin Workspace atau Group Admin, dan perubahan di sini tidak mengubah role member di workspace atau project lain.
            </p>
          </div>

          {dirty && (
            <p className="border border-amber p-2 font-mono text-[10px] leading-relaxed text-amber">
              Ada perubahan yang belum disimpan. Tekan &quot;Simpan Role&quot; untuk menerapkan.
            </p>
          )}
          {!dirty && saveNotice && <p className="border border-mint p-2 font-mono text-[10px] text-mint">✓ {saveNotice}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSaveRole} disabled={!dirty || updateRole.isPending} className="font-mono text-[10px] uppercase tracking-[0.06em]">
              {updateRole.isPending ? 'Menyimpan...' : 'Simpan Role'}
            </Button>
          </div>

          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-destructive">Keluarkan dari Project</div>
            <p className="font-mono text-[9.5px] leading-relaxed text-text-muted">
              {target.is_scoped
                ? `Akses ke project ${projectName} dicabut. Akun ${target.email} tetap terdaftar di organisasi dan dapat ditambahkan kembali kapan saja. Task yang pernah dikerjakan tetap tersimpan atas namanya.`
                : `Member ini mendapat akses dari role workspace ${target.workspace_role?.toUpperCase() ?? '—'}. Mengeluarkannya hanya membatasi project ${projectName} -- role di workspace dan akses ke project lain tetap berlaku.`}
            </p>
            {confirmingRemove ? (
              <div className="flex gap-2">
                <Button
                  onClick={handleRemove}
                  disabled={removeMember.isPending}
                  className="border-destructive bg-destructive font-mono text-[10px] uppercase tracking-[0.06em] text-destructive-foreground hover:bg-destructive/90"
                >
                  {removeMember.isPending ? 'Memproses...' : 'Ya, Keluarkan'}
                </Button>
                <Button variant="outline" onClick={() => setConfirmingRemove(false)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
                  Batal
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setConfirmingRemove(true)}
                className="w-fit border-destructive/50 font-mono text-[10px] uppercase tracking-[0.06em] text-destructive hover:bg-destructive/10"
              >
                Keluarkan dari Project
              </Button>
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
