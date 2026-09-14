import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { useWorkspaceMembers } from '@/features/workspace-members/hooks'
import { useCreateProject } from '@/features/projects/hooks'
import { cn } from '@/lib/utils'

// S4-04/S4-05, US-012, diperluas S4W susulan (dikonfirmasi user
// 2026-09-13: "buat seperti Tambah/Kelola Workspace, tapi tetap
// pertahankan daftar member yang sudah ada") -- 2 mode PM sama pola
// CreateWorkspaceModal: "Member Yang Ada" (SELURUH member workspace ini,
// bukan cuma yang sudah project_manager -- dipilih -> rolenya dinaikkan
// jadi PM saat project dibuat) dan "Undang Baru" (email terdaftar ->
// langsung jadi PM aktif; belum terdaftar -> undangan dikirim, project
// TETAP dibuat berstatus "menunggu PM"). Sebelumnya kandidat cuma member
// ber-role project_manager -- workspace baru tanpa PM jadi tidak pernah
// bisa buat project sama sekali tanpa lebih dulu ke menu Members & Roles.
interface AddProjectModalProps {
  workspaceId: string
  open: boolean
  onClose: () => void
}

const CODE_RE = /^[A-Za-z]{2,5}$/
type PMMode = 'existing' | 'invite'

export default function AddProjectModal({ workspaceId, open, onClose }: AddProjectModalProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [pmMode, setPmMode] = useState<PMMode>('existing')
  const [pmUserId, setPmUserId] = useState('')
  const [pmEmail, setPmEmail] = useState('')
  const [pmName, setPmName] = useState('')
  const [formError, setFormError] = useState('')
  const members = useWorkspaceMembers(workspaceId)
  const createProject = useCreateProject(workspaceId)

  const memberCandidates = members.data ?? []

  const handleClose = () => {
    setName('')
    setCode('')
    setPmMode('existing')
    setPmUserId('')
    setPmEmail('')
    setPmName('')
    setFormError('')
    onClose()
  }

  const handleSave = () => {
    setFormError('')
    if (!name.trim()) {
      setFormError('Nama project wajib diisi.')
      return
    }
    if (!CODE_RE.test(code.trim())) {
      setFormError('Kode task wajib 2-5 huruf (tanpa angka/simbol), contoh: RIL.')
      return
    }
    if (pmMode === 'existing') {
      if (!pmUserId) {
        setFormError('Pilih satu Project Manager penanggung jawab.')
        return
      }
    } else if (!pmEmail.trim() || !pmName.trim()) {
      setFormError('Email dan nama Project Manager wajib diisi untuk undangan baru.')
      return
    }
    createProject.mutate(
      {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        pm: pmMode === 'existing' ? { userId: pmUserId } : { email: pmEmail.trim(), name: pmName.trim() },
      },
      {
        onSuccess: handleClose,
        onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Gagal membuat project.'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Project Baru</DialogTitle>
          <div className="mt-1.5 text-[13px] text-text-muted">Project menaungi sprint dan task di workspace ini.</div>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          {formError && (
            <div className="border border-destructive px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">
              ⚠ {formError}
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-[2]">
              <Label htmlFor="project-name" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                Nama Project
              </Label>
              <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rilis Aplikasi Q4" />
            </div>
            <div className="flex-1">
              <Label htmlFor="project-code" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                Kode Task
              </Label>
              <Input
                id="project-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase())}
                maxLength={5}
                placeholder="RIL"
                className="text-center font-mono tracking-[0.1em]"
              />
              <div className="mt-1.5 font-mono text-[9px] text-text-faint">Prefiks nomor task -- {code || 'RIL'}-001, ...</div>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              Project Manager Penanggung Jawab
            </Label>
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => setPmMode('existing')}
                className={cn(
                  'px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em]',
                  pmMode === 'existing' ? 'bg-signal text-bg-deep' : 'border border-line-strong text-text-muted',
                )}
              >
                Member Yang Ada
              </button>
              <button
                type="button"
                onClick={() => setPmMode('invite')}
                className={cn(
                  'px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em]',
                  pmMode === 'invite' ? 'bg-signal text-bg-deep' : 'border border-line-strong text-text-muted',
                )}
              >
                Undang Baru
              </button>
            </div>

            {pmMode === 'existing' ? (
              memberCandidates.length === 0 ? (
                <div className="border border-dashed border-line-strong px-3.5 py-3 font-mono text-[10px] leading-relaxed text-text-muted">
                  Belum ada member di workspace ini. Gunakan tab Undang Baru untuk menunjuk PM lewat email.
                </div>
              ) : (
                <div className="flex max-h-[190px] flex-col overflow-y-auto border border-line">
                  {memberCandidates.map((m) => {
                    const active = pmUserId === m.user_id
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => setPmUserId(active ? '' : m.user_id)}
                        className={cn(
                          'flex items-center gap-2.5 border-t border-line-subtle px-3 py-2.5 text-left first:border-t-0',
                          active && 'bg-accent-wash',
                        )}
                      >
                        <span className={cn('font-mono text-[11px]', active ? 'text-signal' : 'text-text-muted')}>
                          {active ? '●' : '○'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <div className={cn('truncate text-[12.5px]', active ? 'text-signal' : 'text-text-body')}>
                            {m.display_name}
                          </div>
                          <div className="truncate font-mono text-[9px] text-text-muted">
                            {m.email} · {m.role.replace(/_/g, ' ')}
                          </div>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              <div className="space-y-2">
                <div className="flex gap-3">
                  <Input
                    value={pmEmail}
                    onChange={(e) => setPmEmail(e.target.value)}
                    placeholder="pm@perusahaan.co.id"
                    className="flex-1"
                  />
                  <Input value={pmName} onChange={(e) => setPmName(e.target.value)} placeholder="Nama PM" className="flex-1" />
                </div>
                <p className="font-mono text-[9px] leading-relaxed text-text-faint">
                  Kalau email sudah terdaftar sebagai user PRODO, langsung ditetapkan sebagai PM tanpa undangan. Kalau
                  belum, sistem mengirim undangan (72 jam) -- project tetap dibuat, berstatus "menunggu PM" sampai
                  diterima.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
          <Button onClick={handleSave} disabled={createProject.isPending} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            {createProject.isPending ? 'Menyimpan...' : 'Buat Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
