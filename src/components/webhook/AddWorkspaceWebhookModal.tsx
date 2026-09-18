import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useProjects } from '@/features/projects/hooks'
import { useCreateWorkspaceWebhook, useUpdateWorkspaceWebhook } from '@/features/webhook/hooks'
import { SUPPORTED_WEBHOOK_EVENTS } from '@/features/webhook/types'
import type { Webhook } from '@/features/webhook/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const HTTPS_PATTERN = /^https:\/\/[^\s]+\.[^\s]+/i

// EVENT_LABELS -- deskripsi singkat 3 event nyata (SupportedWebhookEvents,
// backend internal/service/webhook.go) -- 7 event lain di desain "AW Add
// Webhook.dc.html" (task.*, comment.created, rule.executed) TIDAK
// ditawarkan, belum py trigger nyata (implementation_gaps.md IG-44).
const EVENT_LABELS: Record<string, string> = {
  'project.created': 'Project baru dibuat',
  'project.updated': 'Project diperbarui',
  'project.deleted': 'Project dihapus',
}

interface AddWorkspaceWebhookModalProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  workspaceName: string
  // editing (susulan, dikonfirmasi user "tambahkan kelola juga seperti GA")
  // -- null berarti mode Tambah (markup asli "AW Add Webhook.dc.html"),
  // terisi berarti mode Kelola (edit nama/url/LINGKUP/events endpoint yang
  // sudah ada) -- pola sama WebhookFormModal.tsx (GA), satu form dua mode.
  editing?: Webhook | null
}

export default function AddWorkspaceWebhookModal({ open, onClose, workspaceId, workspaceName, editing = null }: AddWorkspaceWebhookModalProps) {
  const isEdit = editing !== null
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [scope, setScope] = useState('') // '' = Seluruh workspace, else projectId
  const [events, setEvents] = useState<string[]>([])
  const [formError, setFormError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [savedSecret, setSavedSecret] = useState<string | null>(null)
  // created (susulan, dikonfirmasi user setelah laporan "field kok berubah
  // sendiri") -- begitu Tambah baru berhasil, form dikunci (bukan
  // dikosongkan seperti sebelumnya): field tetap menampilkan apa yang baru
  // disimpan, tombol Simpan disembunyikan. Alasannya BUKAN kosmetik --
  // kalau field tetap bisa diedit dan tombol Simpan masih ada, klik lagi
  // akan create.mutate() KEDUA KALINYA (bukan update, isEdit tetap false)
  // dan bikin webhook duplikat dengan secret baru. Untuk edit endpoint yang
  // sudah dibuat, tutup modal ini lalu buka "Kelola" dari grid.
  const [created, setCreated] = useState(false)
  const locked = !isEdit && created
  // secretRef -- signing secret sengaja diletakkan PALING BAWAH form
  // (setelah semua field), bukan paling atas -- supaya begitu berhasil
  // simpan, view di-scroll ke situ (kalau cuma diletakkan di atas, sempat
  // luput dari perhatian user karena bukan area yang sedang dilihat saat
  // menekan tombol Simpan di bawah).
  const secretRef = useRef<HTMLDivElement>(null)

  const projects = useProjects(workspaceId)
  const create = useCreateWorkspaceWebhook(workspaceId)
  const update = useUpdateWorkspaceWebhook(workspaceId)

  useEffect(() => {
    if (savedSecret) secretRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [savedSecret])

  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setUrl(editing?.url ?? '')
    setScope(editing?.project_id ?? '')
    setEvents(editing?.events ?? [])
    setFormError(false)
    setErrorMsg('')
    setSavedMsg(null)
    setSavedSecret(null)
    setCreated(false)
    create.reset()
    update.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const activeProjects = (projects.data ?? []).filter((p) => !p.is_archived)
  const urlInvalid = url.trim() !== '' && !HTTPS_PATTERN.test(url.trim())
  const toggleEvent = (e: string) => setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))

  // dirty -- pola sama WebhookFormModal.tsx (GA)/ManageStatusPanel: notice
  // "belum disimpan" cuma relevan di mode Kelola.
  const dirty =
    isEdit &&
    !!editing &&
    (name.trim() !== editing.name ||
      url.trim() !== editing.url ||
      scope !== (editing.project_id ?? '') ||
      events.length !== editing.events.length ||
      events.some((e) => !editing.events.includes(e)))

  const onSave = () => {
    const trimmedName = name.trim()
    const trimmedUrl = url.trim()
    if (trimmedName.length < 4) {
      setFormError(true)
      setErrorMsg('Nama endpoint minimal 4 karakter.')
      return
    }
    if (!HTTPS_PATTERN.test(trimmedUrl)) {
      setFormError(true)
      setErrorMsg('URL harus HTTPS dan berupa host yang valid.')
      return
    }
    if (events.length === 0) {
      setFormError(true)
      setErrorMsg('Pilih minimal satu event yang dikirim.')
      return
    }
    const values = { project_id: scope, name: trimmedName, url: trimmedUrl, events }
    if (isEdit && editing) {
      update.mutate({ webhookId: editing.id, values }, { onSuccess: () => setSavedMsg('Perubahan webhook tersimpan dan tercatat di Audit Trail.') })
      return
    }
    create.mutate(values, {
      onSuccess: (res) => {
        setSavedSecret(res.secret)
        setSavedMsg(`Endpoint "${trimmedName}" aktif dan menerima ${events.length} jenis event.`)
        setCreated(true)
        setFormError(false)
      },
    })
  }

  const saveError = (isEdit ? update.error : create.error) instanceof ApiError ? ((isEdit ? update.error : create.error) as ApiError) : null
  const saving = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? editing.name : 'Tambah Endpoint Webhook'}</DialogTitle>
          <p className="mt-1 text-sm text-text-muted">Workspace {workspaceName}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
            PRODO mengirim payload JSON bertanda tangan HMAC-SHA256 pada header <span className="font-mono">X-Prodo-Signature</span>. Batas 100
            event per menit per organisasi; kegagalan dicoba ulang tiga kali dengan backoff 1 / 5 / 15 menit.
          </p>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-320px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-text-dim">NAMA ENDPOINT</label>
            <input
              value={name}
              disabled={locked}
              onChange={(e) => {
                setName(e.target.value)
                setFormError(false)
              }}
              placeholder="Notifikasi channel operasional"
              className={cn(
                'w-full border bg-input-bg px-3 py-2.5 text-[12.5px] text-text-bone outline-none focus-visible:border-signal disabled:opacity-50',
                formError && name.trim().length < 4 ? 'border-destructive' : 'border-line-strong',
              )}
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-text-dim">URL TUJUAN · WAJIB HTTPS</label>
            <input
              value={url}
              disabled={locked}
              onChange={(e) => {
                setUrl(e.target.value.replace(/\s/g, ''))
                setFormError(false)
              }}
              placeholder="https://hooks.workspace.internal/prodo/ops"
              className={cn(
                'w-full border bg-input-bg px-3 py-2.5 font-mono text-[12px] text-text-bone outline-none focus-visible:border-signal disabled:opacity-50',
                urlInvalid || (formError && !HTTPS_PATTERN.test(url.trim())) ? 'border-destructive' : 'border-line-strong',
              )}
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-text-dim">LINGKUP</label>
            <div className="flex flex-wrap gap-2">
              {/* Label pakai nama workspace ini (bukan "Seluruh Workspace" generik,
                  susulan dikonfirmasi user) -- cakupannya SELALU workspace ini saja
                  (project_id NULL), tidak pernah lintas workspace/organisasi lain;
                  label lama membingungkan seolah berlaku lintas semua workspace. */}
              <button
                type="button"
                disabled={locked}
                onClick={() => setScope('')}
                className={cn(
                  'border px-3 py-2 font-mono text-[10px] tracking-[0.04em] disabled:opacity-50',
                  scope === '' ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                )}
              >
                WORKSPACE {workspaceName.toUpperCase()}
              </button>
              {activeProjects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setScope(p.id)}
                  className={cn(
                    'border px-3 py-2 font-mono text-[10px] tracking-[0.04em] disabled:opacity-50',
                    scope === p.id ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                  )}
                >
                  PROJECT {p.name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="font-mono text-[9px] tracking-[0.14em] text-text-dim">EVENT YANG DIKIRIM</label>
              <span className={cn('font-mono text-[9px]', events.length ? 'text-mint' : 'text-text-muted')}>{events.length} EVENT DIPILIH</span>
            </div>
            <div className="flex flex-col border border-line-strong">
              {SUPPORTED_WEBHOOK_EVENTS.map((e, i) => {
                const on = events.includes(e)
                return (
                  <div
                    key={e}
                    onClick={() => {
                      if (locked) return
                      toggleEvent(e)
                      setFormError(false)
                    }}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5',
                      locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-signal',
                      i > 0 && 'border-t border-line',
                      on && 'bg-signal/10',
                    )}
                  >
                    <span className={cn('font-mono text-[11px]', on ? 'text-signal' : 'text-text-dim')}>{on ? '☑' : '☐'}</span>
                    <span className={cn('font-mono text-[10.5px]', on ? 'text-signal' : 'text-text-bone')}>{e}</span>
                    <span className="ml-auto text-[11.5px] text-text-muted">{EVENT_LABELS[e] ?? ''}</span>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 font-mono text-[8.5px] leading-relaxed text-text-dim">
              7 event lain dari desain (task.*, comment.created, rule.executed) belum tersedia -- fitur task/comment/rule automation belum dibangun.
            </p>
          </div>

          {dirty && (
            <p className="border border-amber p-2.5 font-mono text-[10px] leading-relaxed text-amber">
              Ada perubahan yang belum disimpan. Tekan &quot;Simpan Perubahan&quot; untuk menerapkan.
            </p>
          )}
          {locked && (
            <p className="font-mono text-[9px] leading-relaxed text-text-dim">
              Endpoint ini sudah tersimpan dan tidak dapat diubah lagi di form ini -- tutup lalu buka &quot;✎ Kelola&quot; dari grid untuk mengubahnya.
            </p>
          )}
          {!dirty && savedMsg && !savedSecret && <p className="border border-mint p-2.5 font-mono text-[10px] leading-relaxed text-mint">✓ {savedMsg}</p>}
          {formError && <p className="border border-destructive p-2.5 font-mono text-[10px] leading-relaxed text-destructive">⚠ {errorMsg}</p>}
          {saveError && <p className="text-[11px] text-destructive">{saveError.message}</p>}

          {/* Signing secret sengaja PALING BAWAH (susulan, dikonfirmasi user)
              -- ref di-scroll otomatis ke sini begitu tersimpan, supaya user
              benar-benar sadar nilai sekali-tampil ini sebelum menutup modal. */}
          {savedSecret && (
            <div ref={secretRef} className="relative flex flex-col gap-2 border border-mint p-3.5 pr-8">
              <button type="button" onClick={() => { setSavedMsg(null); setSavedSecret(null) }} className="absolute right-2 top-2 text-text-muted hover:text-text-bone" title="Tutup">
                ✕
              </button>
              <div className="font-mono text-[10px] leading-relaxed text-mint">✓ {savedMsg}</div>
              <div className="font-mono text-[9px] tracking-[0.1em] text-text-dim">SIGNING SECRET</div>
              <div className="break-all border border-line-strong bg-input-bg p-2.5 font-mono text-[12.5px] text-text-bone">{savedSecret}</div>
              <div className="font-mono text-[9px] leading-relaxed text-text-dim">
                Salin sekarang -- nilai penuh tidak ditampilkan lagi dan tidak dicatat di Audit Trail.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!locked && (
            <Button type="button" disabled={saving} onClick={onSave} className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]">
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan'}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
