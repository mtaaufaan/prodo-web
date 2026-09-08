import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  memberKeys,
  useAssignWorkspaceRole,
  useDeactivateMember,
  useReactivateMember,
  useRevokeWorkspaceRole,
  useToggleExecutive,
  useUpdateMemberIdentity,
} from '@/features/members/hooks'
import type { GroupMember } from '@/features/members/types'
import { createInvitations } from '@/features/workspace-members/api'
import { useWorkspaceListByGroup } from '@/features/workspaces/hooks'
import { ApiError } from '@/lib/api'

const WS_ROLES = ['admin_workspace', 'project_manager', 'editor', 'approver', 'division_viewer', 'viewer']

function roleLabel(role: string) {
  return role.toUpperCase().replace(/_/g, ' ')
}

interface ManageMemberModalProps {
  member: GroupMember | null
  groupId: string
  onClose: () => void
}

// ManageMemberModal -- panel "KELOLA MEMBER" (Members & Roles, forward-pull
// US-086, Track S4G, desain "GA Members Roles.dc.html"). Baris GROUP ADMIN
// tidak pernah membuka modal ini (GroupMembersPage: 🔒 Terkunci) -- tidak
// perlu guard is_group_admin di sini lagi.
export default function ManageMemberModal({ member, groupId, onClose }: ManageMemberModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [title, setTitle] = useState('')
  const [addWorkspaceId, setAddWorkspaceId] = useState('')
  const [addRole, setAddRole] = useState('viewer')
  const [addError, setAddError] = useState<string | null>(null)

  const toggleExecutive = useToggleExecutive(groupId)
  const updateIdentity = useUpdateMemberIdentity(groupId)
  const deactivate = useDeactivateMember(groupId)
  const reactivate = useReactivateMember(groupId)
  const assignRole = useAssignWorkspaceRole(groupId)
  const revokeRole = useRevokeWorkspaceRole(groupId)
  const wsList = useWorkspaceListByGroup(groupId)
  const queryClient = useQueryClient()
  const [addPending, setAddPending] = useState(false)

  useEffect(() => {
    if (member) {
      setDisplayName(member.display_name)
      setTitle(member.executive_title)
      setAddWorkspaceId('')
      setAddRole('viewer')
      setAddError(null)
    }
  }, [member])

  if (!member) return null

  const availableWorkspaces = (wsList.data ?? []).filter(
    (w) => !member.workspace_roles.some((r) => r.workspace_id === w.id),
  )

  // handleAddAccess -- reuse createInvitations (S2-23: email yang SUDAH
  // terdaftar langsung ditambahkan ke workspace_members, tanpa undangan
  // baru) -- member ini pasti sudah punya akun (baris di direktori ini
  // cuma real user, bukan pending), jadi selalu lewat jalur "AddedDirectly".
  const handleAddAccess = async () => {
    if (!addWorkspaceId) return
    setAddError(null)
    setAddPending(true)
    try {
      await createInvitations(addWorkspaceId, [member.email], addRole)
      setAddWorkspaceId('')
      await queryClient.invalidateQueries({ queryKey: memberKeys.directory(groupId) })
    } catch (e) {
      setAddError(e instanceof ApiError ? e.message : 'Gagal menambah akses')
    } finally {
      setAddPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Kelola Member</DialogTitle>
          <p className="mt-1 text-sm text-text-muted">{member.display_name} · {member.email}</p>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-5 overflow-y-auto px-5 py-5">
          {/* ROLE GROUP-LEVEL */}
          <section className="space-y-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Role Group-Level</div>
            <div className="flex items-center justify-between border border-line p-3">
              <div>
                <div className="text-[13px] text-text-body">Eksekutif</div>
                <div className="text-[11px] text-text-muted">Akses aggregate lintas organisasi dalam grup (Executive Dashboard, menyusul).</div>
              </div>
              <Button
                variant={member.is_executive ? 'outline' : 'default'}
                disabled={toggleExecutive.isPending}
                onClick={() => toggleExecutive.mutate({ userId: member.user_id, assign: !member.is_executive })}
              >
                {member.is_executive ? 'Cabut' : 'Jadikan Eksekutif'}
              </Button>
            </div>
          </section>

          {/* IDENTITAS EKSEKUTIF -- cuma untuk member yang sedang Eksekutif */}
          {member.is_executive && (
            <section className="space-y-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Identitas Eksekutif</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="mm-name">Nama</Label>
                  <Input id="mm-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="mm-title">Jabatan</Label>
                  <Input id="mm-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Chief Operating Officer" />
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={updateIdentity.isPending || displayName.trim().length < 2}
                onClick={() => updateIdentity.mutate({ userId: member.user_id, displayName: displayName.trim(), title: title.trim() })}
              >
                Simpan Identitas
              </Button>
            </section>
          )}

          {/* ROLE PER WORKSPACE */}
          <section className="space-y-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Role per Workspace</div>
            {member.workspace_roles.length === 0 && <p className="text-[12px] text-text-muted">Belum punya akses workspace mana pun.</p>}
            {member.workspace_roles.map((r) => (
              <div key={r.workspace_id} className="flex items-center justify-between gap-2 border border-line px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] text-text-body">{r.workspace_name}</div>
                  <div className="font-mono text-[10px] text-text-muted">{r.org_name}</div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <select
                    value={r.role}
                    disabled={assignRole.isPending}
                    onChange={(e) => assignRole.mutate({ workspaceId: r.workspace_id, userId: member.user_id, role: e.target.value })}
                    className="border border-line-strong bg-input-bg px-2 py-1 font-mono text-[10.5px] text-text-body"
                  >
                    {WS_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={revokeRole.isPending}
                    onClick={() => revokeRole.mutate({ workspaceId: r.workspace_id, userId: member.user_id })}
                    className="font-mono text-[10px] text-destructive hover:underline disabled:opacity-40"
                  >
                    Cabut
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-end gap-2 border border-dashed border-line-strong p-2.5">
              <div className="flex-1">
                <Label className="text-[10px]">Tambah Akses Workspace Lain</Label>
                <select
                  value={addWorkspaceId}
                  onChange={(e) => setAddWorkspaceId(e.target.value)}
                  className="mt-1 w-full border border-line-strong bg-input-bg px-2 py-1.5 font-mono text-[10.5px] text-text-body"
                >
                  <option value="">Pilih workspace…</option>
                  {availableWorkspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.org_name} · {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="border border-line-strong bg-input-bg px-2 py-1.5 font-mono text-[10.5px] text-text-body"
              >
                {WS_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
              <Button size="sm" disabled={!addWorkspaceId || addPending} onClick={handleAddAccess}>
                + Tambah
              </Button>
            </div>
            {addError && <p className="text-[11px] text-destructive">{addError}</p>}
          </section>

          {/* AKSES AKUN */}
          <section className="space-y-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Akses Akun</div>
            <div className="flex items-center justify-between border border-line p-3">
              <div>
                <div className="text-[13px] text-text-body">{member.suspended ? 'Akun nonaktif' : 'Akun aktif'}</div>
                <div className="text-[11px] text-text-muted">
                  {member.suspended ? 'Member tidak bisa login sampai diaktifkan kembali.' : 'Nonaktifkan butuh verifikasi ulang (OTP).'}
                </div>
              </div>
              {member.suspended ? (
                <Button disabled={reactivate.isPending} onClick={() => reactivate.mutate(member.user_id)}>
                  Aktifkan
                </Button>
              ) : (
                <Button variant="destructive" disabled={deactivate.isPending} onClick={() => deactivate.mutate(member.user_id)}>
                  Nonaktifkan
                </Button>
              )}
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
