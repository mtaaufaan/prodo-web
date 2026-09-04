import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useInviteExecutive, useInviteWorkspaceMembers } from '@/features/members/hooks'
import { useWorkspaceListByGroup } from '@/features/workspaces/hooks'
import { ApiError } from '@/lib/api'

const WS_ROLES = ['admin_workspace', 'project_manager', 'editor', 'approver', 'division_viewer', 'viewer']
type Mode = 'workspace' | 'executive'

function parseEmails(raw: string): string[] {
  return Array.from(new Set(raw.split(/[,\n]/).map((e) => e.trim()).filter(Boolean)))
}

interface InviteMemberModalProps {
  open: boolean
  onClose: () => void
  groupId: string
}

// InviteMemberModal -- modal "Undang Member" mode MANUAL saja (desain
// "GA Members Roles.dc.html"). CSV bulk mode SENGAJA tidak dibangun --
// ditunda ke S4G-15-18 (track Import Data resmi yang sudah terjadwal,
// hindari bangun logic import dua kali). Disederhanakan lagi dari mode
// manual desain: SATU pasangan workspace+role per submit (bukan beberapa
// pasangan sekaligus) -- kalau perlu target lain, buka modal lagi.
export default function InviteMemberModal({ open, onClose, groupId }: InviteMemberModalProps) {
  const [mode, setMode] = useState<Mode>('workspace')
  const [emailsRaw, setEmailsRaw] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [role, setRole] = useState('viewer')
  const [execEmail, setExecEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const wsList = useWorkspaceListByGroup(groupId)
  const inviteWorkspace = useInviteWorkspaceMembers(groupId)
  const inviteExecutive = useInviteExecutive(groupId)

  const reset = () => {
    setMode('workspace')
    setEmailsRaw('')
    setWorkspaceId('')
    setRole('viewer')
    setExecEmail('')
    setError(null)
  }
  const handleClose = () => {
    reset()
    onClose()
  }

  const emails = parseEmails(emailsRaw)

  const handleSubmit = async () => {
    setError(null)
    try {
      if (mode === 'workspace') {
        if (!workspaceId || emails.length === 0) return
        await inviteWorkspace.mutateAsync([{ workspaceId, role, emails }])
      } else {
        if (!execEmail.trim()) return
        await inviteExecutive.mutateAsync(execEmail.trim())
      }
      handleClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim undangan')
    }
  }

  const pending = inviteWorkspace.isPending || inviteExecutive.isPending
  const canSubmit = mode === 'workspace' ? workspaceId !== '' && emails.length > 0 : execEmail.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Undang Member</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="flex gap-0.5 border border-line-strong">
            <button
              type="button"
              onClick={() => setMode('workspace')}
              className={`flex-1 py-2 font-mono text-[10.5px] uppercase tracking-[0.04em] ${mode === 'workspace' ? 'bg-signal text-bg-deep' : 'text-text-muted'}`}
            >
              Ke Workspace
            </button>
            <button
              type="button"
              onClick={() => setMode('executive')}
              className={`flex-1 py-2 font-mono text-[10.5px] uppercase tracking-[0.04em] ${mode === 'executive' ? 'bg-signal text-bg-deep' : 'text-text-muted'}`}
            >
              Sebagai Eksekutif
            </button>
          </div>

          {mode === 'workspace' ? (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="inv-emails">Email (pisah dengan koma atau baris baru)</Label>
                <textarea
                  id="inv-emails"
                  value={emailsRaw}
                  onChange={(e) => setEmailsRaw(e.target.value)}
                  rows={3}
                  placeholder="nama1@perusahaan.com, nama2@perusahaan.com"
                  className="border border-line-strong bg-input-bg px-3 py-2 font-mono text-[12px] text-text-body outline-none focus-visible:border-signal"
                />
                {emailsRaw && <p className="font-mono text-[10px] text-text-dim">{emails.length} email terdeteksi</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="inv-ws">Workspace</Label>
                  <select
                    id="inv-ws"
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                    className="border border-line-strong bg-input-bg px-2 py-2 font-mono text-[11px] text-text-body"
                  >
                    <option value="">Pilih workspace…</option>
                    {(wsList.data ?? []).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.org_name} · {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="inv-role">Role</Label>
                  <select
                    id="inv-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="border border-line-strong bg-input-bg px-2 py-2 font-mono text-[11px] text-text-body"
                  >
                    {WS_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.toUpperCase().replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="inv-exec-email">Email</Label>
              <Input
                id="inv-exec-email"
                type="email"
                value={execEmail}
                onChange={(e) => setExecEmail(e.target.value)}
                placeholder="direksi@perusahaan.com"
              />
              <p className="text-[11px] text-text-muted">
                Diundang langsung sebagai Eksekutif grup ini, tanpa akses workspace mana pun.
              </p>
            </div>
          )}

          {error && <p className="text-[11px] text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Batal
          </Button>
          <Button disabled={!canSubmit || pending} onClick={handleSubmit}>
            {pending ? 'Mengirim…' : 'Kirim Undangan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
