import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { memberKeys, useGroupMembers } from '@/features/members/hooks'
import { inviteExecutive, toggleExecutive } from '@/features/members/api'
import { createInvitations } from '@/features/workspace-members/api'
import { useWorkspaceListByGroup } from '@/features/workspaces/hooks'
import { ApiError } from '@/lib/api'

const WS_ROLES = ['admin_workspace', 'project_manager', 'editor', 'approver', 'division_viewer', 'viewer']
let pairSeq = 0
const newPair = () => ({ key: ++pairSeq, workspaceId: '', role: 'viewer' })

function parseEmails(raw: string): string[] {
  return Array.from(new Set(raw.split(/[,\n]/).map((e) => e.trim()).filter(Boolean)))
}

interface InviteMemberModalProps {
  open: boolean
  onClose: () => void
  groupId: string
}

// InviteMemberModal -- modal "Undang Member" (desain "GA Members Roles.dc.html"
// baris 335-502, dibaca ulang langsung 2026-09-04 setelah user menunjukkan
// build sebelumnya menyimpang -- versi awal salah bikin toggle Eksekutif
// jadi TAB TERPISAH, padahal di desain itu SATU form terintegrasi). Mode CSV
// (baris 384-424) SENGAJA tetap tidak dibangun -- ditunda ke S4G-15-18.
//
// Batasan backend yang TIDAK ada di desain (dijelaskan ke user, bukan
// disembunyikan): chk_invitation_shape (migrasi 20260915090300) melarang
// satu baris user_invitations sekaligus bawa workspace_id DAN
// is_executive_invite -- jadi email BARU (belum py akun) yang dikirim
// BERSAMA pasangan workspace TIDAK BISA sekaligus ditandai Eksekutif dalam
// satu submit (tetap dikirim undangan workspace-nya, GA toggle Eksekutif
// belakangan lewat Kelola Member setelah orang itu menerima). Email yang
// SUDAH py akun (dikenali dari direktori grup) tidak kena batasan ini --
// toggle Eksekutif langsung berlaku via endpoint terpisah.
export default function InviteMemberModal({ open, onClose, groupId }: InviteMemberModalProps) {
  const [emailsRaw, setEmailsRaw] = useState('')
  const [execToggle, setExecToggle] = useState(false)
  const [orgId, setOrgId] = useState('')
  const [pairs, setPairs] = useState([newPair()])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const wsList = useWorkspaceListByGroup(groupId)
  const directory = useGroupMembers(groupId)
  const queryClient = useQueryClient()

  const orgOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const w of wsList.data ?? []) seen.set(w.org_id, w.org_name)
    return Array.from(seen, ([id, name]) => ({ id, name }))
  }, [wsList.data])

  useEffect(() => {
    if (open && orgId === '' && orgOptions.length > 0) setOrgId(orgOptions[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orgOptions])

  const workspaceOptions = useMemo(() => (wsList.data ?? []).filter((w) => w.org_id === orgId), [wsList.data, orgId])

  const emails = parseEmails(emailsRaw)
  const knownMembers = useMemo(() => {
    const emailSet = new Set(emails)
    return (directory.data?.members ?? []).filter((m) => !emailSet.has(m.email)).slice(0, 8)
  }, [directory.data, emails])

  const addEmail = (email: string) => {
    setEmailsRaw((raw) => (raw.trim() ? `${raw.trim()}, ${email}` : email))
  }

  const validPairs = pairs.filter((p) => p.workspaceId)
  const execOnly = execToggle && validPairs.length === 0

  const reset = () => {
    setEmailsRaw('')
    setExecToggle(false)
    setOrgId('')
    setPairs([newPair()])
    setError(null)
    setNotice(null)
  }
  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    setError(null)
    setNotice(null)
    if (emails.length === 0) {
      setError('Isi minimal satu email.')
      return
    }
    if (validPairs.length === 0 && !execToggle) {
      setError('Pilih minimal satu pasangan workspace + role, atau aktifkan "Tetapkan sebagai Eksekutif".')
      return
    }

    setSubmitting(true)
    try {
      for (const pair of validPairs) {
        await createInvitations(pair.workspaceId, emails, pair.role)
      }

      if (execToggle) {
        const knownByEmail = new Map((directory.data?.members ?? []).map((m) => [m.email, m]))
        const skipped: string[] = []
        for (const email of emails) {
          const known = knownByEmail.get(email)
          if (known) {
            await toggleExecutive(groupId, known.user_id, true)
          } else if (validPairs.length === 0) {
            await inviteExecutive(groupId, email)
          } else {
            skipped.push(email)
          }
        }
        if (skipped.length > 0) {
          setNotice(
            `Undangan workspace terkirim, tapi ${skipped.join(', ')} belum bisa ditandai Eksekutif sekarang (email baru + workspace sekaligus) -- toggle manual lewat Kelola Member setelah mereka menerima undangan.`,
          )
        }
      }

      await queryClient.invalidateQueries({ queryKey: memberKeys.directory(groupId) })
      // Form dikosongkan (siap undang batch berikutnya), TAPI modal tetap
      // terbuka dan `notice` (kalau ada, mis. email di-skip dari status
      // Eksekutif) tetap tampil -- beda dari handleClose yang reset semuanya.
      setEmailsRaw('')
      setPairs([newPair()])
      setExecToggle(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim undangan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Undang Member</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          {notice && <p className="border border-amber p-2.5 text-[11px] text-amber">{notice}</p>}

          <div className="grid gap-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Alamat Email</label>
            <textarea
              value={emailsRaw}
              onChange={(e) => setEmailsRaw(e.target.value)}
              rows={3}
              placeholder="nama1@perusahaan.com, nama2@perusahaan.com"
              className="border border-line-strong bg-input-bg px-3 py-2 font-mono text-[12px] text-text-body outline-none focus-visible:border-signal"
            />
            {emailsRaw && <p className="font-mono text-[10px] text-text-dim">{emails.length} email terdeteksi</p>}
            {knownMembers.length > 0 && (
              <div className="mt-1">
                <div className="mb-1.5 font-mono text-[8.5px] tracking-[0.1em] text-text-dim">
                  MEMBER YANG SUDAH TERDAFTAR · KLIK UNTUK MENAMBAHKAN
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {knownMembers.map((m) => (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => addEmail(m.email)}
                      className="border border-line-strong px-2 py-1 font-mono text-[9.5px] text-text-muted hover:border-signal hover:text-text-bone"
                    >
                      {m.email}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="border border-line p-2.5 text-[10.5px] leading-relaxed text-text-muted">
              Email yang sudah terdaftar langsung mendapat akses workspace/role di bawah; yang belum terdaftar dikirimi
              tautan undangan berlaku 72 jam.
            </p>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Role Group-Level</label>
            <div className="flex flex-wrap items-center gap-3 border border-line p-3">
              <button
                type="button"
                onClick={() => setExecToggle((v) => !v)}
                className="flex items-center gap-2.5"
              >
                <span
                  className={`flex h-4 w-[30px] flex-shrink-0 items-center border p-0.5 ${execToggle ? 'justify-end border-signal' : 'justify-start border-line-strong'}`}
                >
                  <span className={`block h-2.5 w-2.5 ${execToggle ? 'bg-signal' : 'bg-text-dim'}`} />
                </span>
                <span className={`font-mono text-[9.5px] tracking-[0.06em] ${execToggle ? 'text-signal' : 'text-text-muted'}`}>
                  TETAPKAN SEBAGAI EKSEKUTIF
                </span>
              </button>
              <span className="flex-1 text-[11px] text-text-muted">
                Akses aggregate lintas organisasi dalam grup (Executive Dashboard, menyusul).
              </span>
            </div>
            {execOnly && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="flex-1 text-[11px] text-text-muted">
                  Cakupan seluruh organisasi dalam grup -- tidak perlu memilih organisasi atau workspace.
                </span>
                <button
                  type="button"
                  onClick={() => setPairs((p) => [...p, newPair()])}
                  className="font-mono text-[10px] text-signal hover:underline"
                >
                  + TAMBAHKAN ROLE WORKSPACE
                </button>
              </div>
            )}
          </div>

          {!execOnly && (
            <div>
              <div className="grid gap-1.5">
                <label className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Organisasi</label>
                <select
                  value={orgId}
                  onChange={(e) => {
                    setOrgId(e.target.value)
                    setPairs([newPair()])
                  }}
                  className="border border-line-strong bg-input-bg px-2 py-2 font-mono text-[11px] text-text-body"
                >
                  {orgOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <label className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Workspace + Role</label>
                <button
                  type="button"
                  onClick={() => setPairs((p) => [...p, newPair()])}
                  className="border-b border-line-strong font-mono text-[9px] text-signal"
                >
                  + TAMBAH WORKSPACE
                </button>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {pairs.map((pair) => (
                  <div key={pair.key} className="flex flex-wrap items-center gap-2 border border-line p-2.5">
                    <select
                      value={pair.workspaceId}
                      onChange={(e) =>
                        setPairs((ps) => ps.map((p) => (p.key === pair.key ? { ...p, workspaceId: e.target.value } : p)))
                      }
                      className="min-w-[150px] flex-1 border border-line-strong bg-input-bg px-2 py-1.5 font-mono text-[10.5px] text-text-body"
                    >
                      <option value="">— Pilih workspace —</option>
                      {workspaceOptions.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={pair.role}
                      onChange={(e) => setPairs((ps) => ps.map((p) => (p.key === pair.key ? { ...p, role: e.target.value } : p)))}
                      className="min-w-[150px] flex-1 border border-line-strong bg-input-bg px-2 py-1.5 font-mono text-[10.5px] text-text-body"
                    >
                      {WS_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.toUpperCase().replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                    {pairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPairs((ps) => ps.filter((p) => p.key !== pair.key))}
                        className="text-text-muted hover:text-destructive"
                        aria-label="Hapus pasangan"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-text-dim">
                Satu undangan dapat mencakup beberapa workspace dengan role berbeda.
              </p>
              {execToggle && (
                <button
                  type="button"
                  onClick={() => setPairs([])}
                  className="mt-2 font-mono text-[9.5px] text-text-muted hover:text-destructive"
                >
                  ✕ HAPUS PENUGASAN WORKSPACE — EKSEKUTIF SAJA
                </button>
              )}
            </div>
          )}

          {error && <p className="text-[11px] text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Tutup
          </Button>
          <Button disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Mengirim…' : 'Kirim Undangan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
