import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAddMembersBulk, useProjectMemberCandidates } from '@/features/project-members/hooks'
import { PROJECT_SCOPED_ROLES } from '@/features/project-members/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

interface AddMemberModalProps {
  projectId: string
  projectName: string
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

// Dibangun ulang total (IG-100 susulan, "AW Invite Member.dc.html"
// actingRole='Project Manager') -- versi lama cuma pencarian tunggal per
// Group ID + tambah satu-per-satu, TIDAK sesuai desain otoritatif yang
// dipakai BERSAMA modal Undang Member AW (workspace/InviteMemberModal.tsx):
// textarea bulk email + candidate pool + role radio-picker. Beda dari versi
// AW: TANPA pilihan project (sudah scoped project ini), role dibatasi
// PROJECT_SCOPED_ROLES, dan pool-nya LINTAS SELURUH organisasi (dikonfirmasi
// user) -- ditambahkan lewat POST /projects/:id/members/bulk +
// GET /projects/:id/member-candidates, reuse mesin InvitationService yang
// sama dengan AW (projectScopedOnly=true, lihat backend).
export default function AddMemberModal({ projectId, projectName, open, onClose }: AddMemberModalProps) {
  const [emailsInput, setEmailsInput] = useState('')
  const [role, setRole] = useState(PROJECT_SCOPED_ROLES[0].key)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const addMembersBulk = useAddMembersBulk(projectId)
  const candidates = useProjectMemberCandidates(projectId)

  const handleClose = () => {
    setEmailsInput('')
    setFormError('')
    setSuccessMsg('')
    onClose()
  }

  const emails = parseEmails(emailsInput)
  const pool = candidates.data ?? []

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
      setFormError('Masukkan minimal satu alamat email, atau pilih dari daftar akun di bawah.')
      return
    }
    const invalid = emails.filter((e) => !EMAIL_RE.test(e))
    if (invalid.length > 0) {
      setFormError(`Format email tidak valid: ${invalid.join(', ')}.`)
      return
    }

    addMembersBulk.mutate(
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
        onError: (err) => {
          if (err instanceof ApiError) setFormError(err.message)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Project-Scoped Member</DialogTitle>
          <div className="mt-1.5 text-[13px] text-text-muted">Project {projectName}</div>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-5">
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
              {emails.length > 0 ? `${emails.length} penerima` : 'Ketik email, atau pilih dari daftar akun di bawah.'}
            </div>
          </div>

          {pool.length > 0 && (
            <div>
              <div className="mb-2 font-mono text-[8.5px] uppercase tracking-[0.12em] text-text-muted">
                Akun Terdaftar di Luar Workspace Ini · Klik untuk Menambahkan
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
                        <div className="truncate font-mono text-[8.5px] text-text-muted">
                          {c.email} · {c.org_name}
                        </div>
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
              Role Project-Scoped (Editor / Approver / Viewer)
            </label>
            <div className="flex flex-col border border-line">
              {PROJECT_SCOPED_ROLES.map((r) => {
                const active = role === r.key
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => {
                      setRole(r.key)
                      setFormError('')
                    }}
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
            Akses berlaku pada lingkup project ini saja, bukan seluruh workspace. Akun yang sudah terdaftar — termasuk
            dari organisasi lain — langsung aktif dengan role di atas; yang belum terdaftar dikirimi tautan undangan
            berlaku 72 jam untuk membuat password sendiri. Penambahan member dari luar workspace diberitahukan ke
            Admin Workspace.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
          <Button
            onClick={handleSend}
            disabled={addMembersBulk.isPending}
            className="font-mono text-[10px] uppercase tracking-[0.06em]"
          >
            {addMembersBulk.isPending ? 'Menambahkan...' : 'Tambahkan ke Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
