import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ASSIGNABLE_ROLES } from '@/features/workspace-members/types'
import { useCreateInvitations, useWorkspaceMemberCandidates } from '@/features/workspace-members/hooks'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

// S2-26/S4W-02, US-006 (AW Invite Member.dc.html). admin_workspace
// SENGAJA tidak jadi opsi role -- sama alasan ManageMemberPanel (S4W-01
// guard: hanya Group Admin/Platform Admin yang boleh memberi role itu).
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
const AVATAR_PALETTE = ['bg-signal', 'bg-mint', 'bg-violet', 'bg-blue-400', 'bg-amber']

function initialsOf(name: string, email: string) {
  const source = name && name !== '—' ? name : email
  return source
    .split(/[\s.@]+/)
    .map((w) => w[0] || '')
    .join('')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase()
}

export default function InviteMemberModal({ workspaceId, workspaceName, open, onClose }: InviteMemberModalProps) {
  const [emailsInput, setEmailsInput] = useState('')
  const [role, setRole] = useState(ASSIGNABLE_ROLES[0].key)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const createInvitations = useCreateInvitations(workspaceId)
  const candidates = useWorkspaceMemberCandidates(workspaceId)

  const handleClose = () => {
    setEmailsInput('')
    setFormError('')
    setSuccessMsg('')
    onClose()
  }

  const emails = parseEmails(emailsInput)
  const rateLimited = createInvitations.error instanceof ApiError && createInvitations.error.code === 'RATE_LIMITED'
  const retryAfter = rateLimited
    ? ((createInvitations.error as ApiError).details as { retry_after?: number } | undefined)?.retry_after
    : undefined

  const togglePool = (email: string) => {
    const current = parseEmails(emailsInput)
    const idx = current.findIndex((e) => e.toLowerCase() === email.toLowerCase())
    if (idx >= 0) current.splice(idx, 1)
    else current.push(email)
    setEmailsInput(current.length ? `${current.join(', ')}, ` : '')
    setFormError('')
    setSuccessMsg('')
  }

  const handleSend = () => {
    setFormError('')
    if (emails.length === 0) {
      setFormError('Masukkan minimal satu alamat email, atau pilih dari daftar member di bawah.')
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
          setSuccessMsg(parts.length ? `${parts.join('. ')}. Tercatat di Audit Trail workspace.` : 'Selesai diproses.')
          setEmailsInput('')
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code !== 'RATE_LIMITED') {
            setFormError(err.message)
          }
        },
      },
    )
  }

  const pool = candidates.data ?? []

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
          {rateLimited && (
            <div className="border border-destructive px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">
              ⚠ HTTP 429 — Terlalu banyak permintaan dalam waktu singkat (maks 3 permintaan/menit).
              {retryAfter ? ` Coba lagi dalam ${retryAfter} detik.` : ''} Pelanggaran tercatat di Audit Trail.
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
              {emails.length > 0 ? `${emails.length} penerima` : 'Ketik email, atau pilih dari daftar member di bawah.'}
            </div>
          </div>

          {pool.length > 0 && (
            <div>
              <div className="mb-2 font-mono text-[8.5px] uppercase tracking-[0.12em] text-text-muted">
                Member Terdaftar di Luar Workspace Ini · Klik untuk Menambahkan
              </div>
              <div className="flex max-h-[170px] flex-col overflow-auto border border-line">
                {pool.map((c, i) => {
                  const picked = emails.some((e) => e.toLowerCase() === c.email.toLowerCase())
                  return (
                    <button
                      key={c.user_id}
                      type="button"
                      onClick={() => togglePool(c.email)}
                      className={cn(
                        'flex items-center gap-2.5 border-t border-line-subtle px-3 py-2.5 text-left first:border-t-0',
                        picked && 'bg-accent-wash',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 flex-shrink-0 items-center justify-center text-[11px] font-extrabold text-bg-deep',
                          AVATAR_PALETTE[i % AVATAR_PALETTE.length],
                        )}
                      >
                        {initialsOf(c.display_name, c.email)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] text-text-body">{c.display_name || c.email}</div>
                        <div className="truncate font-mono text-[8.5px] text-text-muted">{c.email}</div>
                      </span>
                      <span className={cn('flex-shrink-0 font-mono text-[9px]', picked ? 'text-signal' : 'text-text-muted')}>
                        {picked ? '● DITAMBAHKAN' : '+ TAMBAH'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

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
