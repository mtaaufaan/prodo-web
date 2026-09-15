import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRemoveMember, useUpdateMemberRole } from '@/features/workspace-members/hooks'
import { ASSIGNABLE_ROLES } from '@/features/workspace-members/types'
import type { WorkspaceMember } from '@/features/workspace-members/types'
import { useProjects } from '@/features/projects/hooks'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

// S4W-02 (desain "AW Members Roles.dc.html", panel "KELOLA MEMBER
// WORKSPACE") -- gabungan RolePickerModal (S2-07) + dialog konfirmasi
// hapus (S3-18) jadi SATU panel per baris member terpilih. admin_workspace
// tidak pernah jadi target panel ini -- baris admin_workspace di grid
// selalu terkunci (lihat WorkspaceMembersPage).
//
// Undangan pending (susulan 2026-09-15, dikonfirmasi user "aksi berisi
// kirim undangan, batalkan seperti pada member & roles GA") -- TIDAK LAGI
// lewat panel ini, grid AW sekarang punya tombol Kirim Ulang/Batalkan
// langsung di baris (lihat WorkspaceMembersPage MemberRow), sama pola
// GroupMembersPage PendingRow. Panel ini murni untuk member EXISTING.
interface ManageMemberPanelProps {
  workspaceId: string
  workspaceName: string
  target: WorkspaceMember | null
  onClose: () => void
}

export default function ManageMemberPanel({ workspaceId, workspaceName, target, onClose }: ManageMemberPanelProps) {
  const [draftRole, setDraftRole] = useState('')
  const [draftProjectId, setDraftProjectId] = useState('')
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  // saveNotice (susulan 2026-09-15, dikonfirmasi user via screenshot
  // ManageWorkspaceModal "Ada perubahan yang belum disimpan...") -- pola
  // dirty+saved notice yang SUDAH dipakai di setiap modal Kelola lain
  // (ManageWorkspaceModal/ManageOrganizationModal/ManageProjectModal/
  // ManageMemberModal GA), TAPI belum ada di panel ini. Ganti toast
  // sebelumnya (hilang begitu modal ditutup/dibuka lagi, tidak konsisten
  // dengan konvensi Kelola lain yang TIDAK pakai showToast sama sekali
  // untuk aksi Simpan utamanya).
  const [saveNotice, setSaveNotice] = useState('')
  const prevUserIdRef = useRef<string | null>(null)
  const updateRole = useUpdateMemberRole(workspaceId)
  const removeMember = useRemoveMember(workspaceId)
  const projects = useProjects(workspaceId)

  useEffect(() => {
    if (target) {
      setDraftRole(target.role)
      // Pre-fill dari keterkaitan project SAAT INI (project_id, backend
      // gains field ini 2026-09-14 setelah user melaporkan "dropdown
      // project tidak terbinding") -- tetap bisa diganti kalau AW memang
      // ingin memindahkan (move semantics tetap berlaku saat Simpan).
      setDraftProjectId(target.project_id || '')
      // saveNotice HANYA direset saat ganti member (bukan setiap refetch)
      // -- sama fix race condition seperti ManageOrganizationModal/
      // ManageMemberModal GA.
      if (prevUserIdRef.current !== target.user_id) setSaveNotice('')
      prevUserIdRef.current = target.user_id
    } else {
      prevUserIdRef.current = null
    }
    setConfirmingRemove(false)
  }, [target])

  const activeProjects = (projects.data ?? []).filter((p) => !p.is_archived)

  if (!target) return null
  const displayName = target.display_name || target.email
  const email = target.email
  const currentRole = target.role
  // isProjectScopedRole (susulan 2026-09-14, dikonfirmasi user setelah
  // screenshot Fia/IT-Eldwin: "jika pm dan editor approver viewer, hanya
  // dikeluarkan dari project") -- ASSIGNABLE_ROLES persis 4 role
  // project-scoped (admin_workspace/division_viewer TIDAK termasuk, tetap
  // "Keluarkan dari Workspace" seperti sebelumnya).
  const isProjectScopedRole = ASSIGNABLE_ROLES.some((r) => r.key === currentRole)
  const dirty = draftRole !== target.role || draftProjectId !== (target.project_id || '')

  const handleSaveRole = () => {
    if (!draftProjectId) return
    updateRole.mutate(
      { userId: target.user_id, role: draftRole, projectId: draftProjectId },
      { onSuccess: () => setSaveNotice('Perubahan role tersimpan. Tercatat di Audit Trail workspace.') },
    )
  }

  const handleRemove = () => {
    removeMember.mutate(
      { userId: target.user_id, projectId: isProjectScopedRole ? target.project_id || undefined : undefined },
      { onSuccess: onClose },
    )
  }

  const activeError = [updateRole.error, removeMember.error].find((e) => e instanceof ApiError) as ApiError | undefined

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-signal">Kelola Member Workspace</div>
          <DialogTitle className="mt-1.5 text-[15px] font-bold text-text-bone">{displayName}</DialogTitle>
          <div className="mt-1 font-mono text-[9.5px] text-text-muted">{email}</div>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          {activeError && (
            <div className="border border-destructive px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">
              ⚠ {activeError.message}
            </div>
          )}

          <div>
            <label className="mb-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              Project -- PM/Editor/Approver/Viewer berjalan PER PROJECT
            </label>
            <select
              value={draftProjectId}
              onChange={(e) => setDraftProjectId(e.target.value)}
              className="w-full border border-line-strong bg-bg-deep px-2.5 py-2 font-mono text-[11px] text-text-body outline-none focus-visible:border-signal"
            >
              <option value="">— Pilih project —</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-text-dim">
              Wajib dipilih setiap kali menyimpan -- keterkaitan project LAMA (kalau ada) dipindah ke project ini,
              bukan ditambah. Kalau member ini satu-satunya PM project lain, project itu tidak boleh sampai tanpa
              PM -- tetapkan PM baru dulu lewat Kelola Project.
            </p>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              Role Pada Project di Atas
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
            <div className="mt-2 font-mono text-[9px] leading-relaxed text-text-dim">
              Perubahan role berlaku langsung tanpa member logout dan login ulang. Admin Workspace tidak dapat memberi
              atau mencabut role Admin Workspace — itu wewenang Group Admin di level organisasi.
            </div>
          </div>

          {dirty && (
            <p className="border border-amber p-2 font-mono text-[10px] leading-relaxed text-amber">
              Ada perubahan yang belum disimpan. Tekan &quot;Simpan Role&quot; untuk menerapkan.
            </p>
          )}
          {!dirty && saveNotice && (
            <p className="border border-mint p-2 font-mono text-[10px] text-mint">✓ {saveNotice}</p>
          )}
          <div className="flex gap-2">
            <Button
              onClick={handleSaveRole}
              disabled={!draftProjectId || updateRole.isPending}
              className="font-mono text-[10px] uppercase tracking-[0.06em]"
            >
              {updateRole.isPending ? 'Menyimpan...' : 'Simpan Role'}
            </Button>
          </div>

          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-destructive">
              {isProjectScopedRole ? `Keluarkan dari Project ${target.project_names || '-'}` : 'Keluarkan dari Workspace'}
            </div>
            <p className="font-mono text-[9.5px] leading-relaxed text-text-muted">
              {isProjectScopedRole
                ? `Keterkaitan ${email} ke project ${target.project_names || '-'} dilepas. Role ${currentRole.replace('_', ' ')} cuma berlaku lewat project -- kalau ini satu-satunya project yang dia tangani di workspace ini, aksesnya ke workspace ${workspaceName} ikut tercabut sepenuhnya (akun tetap aktif di organisasi induk, dapat ditambahkan kembali kapan saja). Kalau dia masih tertaut ke project lain, dia tetap member workspace ini.`
                : `Akses ke workspace ${workspaceName} langsung dicabut. Akun ${email} tetap aktif di organisasi induk dan dapat ditambahkan kembali kapan saja.`}
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
                <Button
                  variant="outline"
                  onClick={() => setConfirmingRemove(false)}
                  className="font-mono text-[10px] uppercase tracking-[0.06em]"
                >
                  Batal
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setConfirmingRemove(true)}
                className="w-fit border-destructive/50 font-mono text-[10px] uppercase tracking-[0.06em] text-destructive hover:bg-destructive/10"
              >
                {isProjectScopedRole ? `Keluarkan dari Project ${target.project_names || '-'}` : 'Keluarkan dari Workspace'}
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
