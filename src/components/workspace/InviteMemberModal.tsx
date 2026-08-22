import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ASSIGNABLE_ROLES } from '@/features/workspace-members/types'
import { useCreateInvitations } from '@/features/workspace-members/hooks'
import { cn } from '@/lib/utils'

// S2-26, US-006 (AW Invite Member.dc.html) -- versi minimal: textarea
// email + role picker, TANPA "pool" member organisasi lain yang bisa
// diklik langsung (butuh query kandidat lintas-workspace yang belum ada)
// dan TANPA rate-limit 429 notice (rate limiting belum dibangun, S11).
// admin_workspace SENGAJA tidak jadi opsi role -- sama alasan RolePickerModal.
interface InviteMemberModalProps {
  workspaceId: string
  workspaceName: string
  open: boolean
  onClose: () => void
}

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i

export default function InviteMemberModal({ workspaceId, workspaceName, open, onClose }: InviteMemberModalProps) {
  const [emailsInput, setEmailsInput] = useState('')
  const [role, setRole] = useState(ASSIGNABLE_ROLES[0].key)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const createInvitations = useCreateInvitations(workspaceId)

  const handleClose = () => {
    setEmailsInput('')
    setFormError('')
    setSuccessMsg('')
    onClose()
  }

  const handleSend = () => {
    setFormError('')
    const emails = parseEmails(emailsInput)
    if (emails.length === 0) {
      setFormError('Masukkan minimal satu alamat email.')
      return
    }
    const invalid = emails.filter((e) => !EMAIL_RE.test(e))
    if (invalid.length > 0) {
      setFormError(`Format email tidak valid: ${invalid.join(', ')}.`)
      return
    }

    createInvitations.mutate(
      { emails, role },
      {
        onSuccess: (result) => {
          const parts: string[] = []
          if (result.invitation_ids.length) {
            parts.push(`${result.invitation_ids.length} undangan email dikirim (berlaku 72 jam)`)
          }
          if (result.added_directly?.length) {
            parts.push(`${result.added_directly.length} akun sudah terdaftar — akses langsung aktif sebagai ${role}`)
          }
          const failed = Object.keys(result.errors)
          if (failed.length) {
            parts.push(`${failed.length} gagal: ${failed.join(', ')}`)
          }
          setSuccessMsg(parts.length ? `${parts.join('. ')}.` : 'Selesai diproses.')
          setEmailsInput('')
        },
        onError: () => setFormError('Gagal mengirim undangan. Coba lagi.'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Undang Member ke Workspace</DialogTitle>
          <div className="mt-1.5 text-[13px] text-text-muted">Workspace {workspaceName}</div>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-5">
          {successMsg && (
            <div className="border border-mint px-3.5 py-3 font-mono text-[10px] leading-relaxed text-mint">
              ✓ {successMsg}
            </div>
          )}
          {formError && (
            <div className="border border-destructive px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">
              ⚠ {formError}
            </div>
          )}

          <div>
            <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              Alamat Email · Pisahkan dengan Koma atau Baris Baru
            </label>
            <textarea
              value={emailsInput}
              onChange={(e) => {
                setEmailsInput(e.target.value)
                setFormError('')
              }}
              placeholder="nama@domain.co.id"
              className="h-24 w-full resize-y border border-line bg-bg-deep px-3 py-2.5 font-mono text-[12px] leading-relaxed text-text-body outline-none"
            />
            <div className="mt-1.5 font-mono text-[9px] text-text-faint">
              {parseEmails(emailsInput).length > 0 ? `${parseEmails(emailsInput).length} penerima` : 'Ketik satu atau lebih email.'}
            </div>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              Role di Workspace Ini
            </label>
            <div className="flex flex-col border border-line">
              {ASSIGNABLE_ROLES.map((r) => {
                const active = role === r.key
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRole(r.key)}
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
          </div>

          <p className="border border-line px-3.5 py-3 font-mono text-[9px] leading-relaxed text-text-dim">
            Sistem memeriksa tiap email: yang sudah terdaftar langsung mendapat akses workspace ini dengan role di
            atas; yang belum terdaftar dikirimi tautan undangan berlaku 72 jam untuk membuat password sendiri.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
          <Button
            onClick={handleSend}
            disabled={createInvitations.isPending}
            className="font-mono text-[10px] uppercase tracking-[0.06em]"
          >
            {createInvitations.isPending ? 'Mengirim...' : 'Tambahkan ke Workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
