import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Organization } from '@/features/organizations/types'
import {
  useCreateWebhook,
  useDeleteWebhook,
  useRegenerateWebhookSecret,
  useTestWebhook,
  useToggleWebhookActive,
  useUpdateWebhook,
} from '@/features/webhook/hooks'
import { SUPPORTED_WEBHOOK_EVENTS } from '@/features/webhook/types'
import type { Webhook } from '@/features/webhook/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const HTTPS_PATTERN = /^https:\/\/[^\s]+\.[^\s]+/i

interface WebhookFormModalProps {
  open: boolean
  onClose: () => void
  groupId: string
  orgs: Organization[]
  editing: Webhook | null
}

// WebhookFormModal (Track S4G, desain "GA Add Webhook.dc.html") -- form
// tunggal untuk Buat + Kelola (edit) webhook, sama pola AllocationModal/
// RetentionPolicyModal. Event trigger CUMA 3 (SUPPORTED_WEBHOOK_EVENTS) --
// 7 dari 10 checkbox desain SENGAJA tidak ditampilkan, tidak punya trigger
// nyata di backend (implementation_gaps.md IG-44).
export default function WebhookFormModal({ open, onClose, groupId, orgs, editing }: WebhookFormModalProps) {
  const isEdit = editing !== null
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [orgId, setOrgId] = useState('')
  const [events, setEvents] = useState<string[]>([])
  const [formError, setFormError] = useState(false)
  const [secretValue, setSecretValue] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const create = useCreateWebhook(groupId)
  const update = useUpdateWebhook(groupId)
  const toggleActive = useToggleWebhookActive(groupId)
  const regenerate = useRegenerateWebhookSecret(groupId)
  const test = useTestWebhook(groupId)
  const remove = useDeleteWebhook(groupId)

  useEffect(() => {
    if (!open) return
    setFormError(false)
    setSecretValue(null)
    setNotice(null)
    setName(editing?.name ?? '')
    setUrl(editing?.url ?? '')
    setOrgId(editing?.org_id ?? '')
    setEvents(editing?.events ?? [])
  }, [open, editing])

  const handleClose = () => {
    create.reset()
    update.reset()
    toggleActive.reset()
    regenerate.reset()
    test.reset()
    remove.reset()
    onClose()
  }

  const urlInvalid = url.trim() !== '' && !HTTPS_PATTERN.test(url.trim())
  const toggleEvent = (e: string) => setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))

  const onSave = () => {
    const trimmedName = name.trim()
    const trimmedUrl = url.trim()
    if (!trimmedName || !HTTPS_PATTERN.test(trimmedUrl) || events.length === 0) {
      setFormError(true)
      return
    }
    const values = { org_id: orgId, name: trimmedName, url: trimmedUrl, events }
    if (isEdit && editing) {
      update.mutate({ webhookId: editing.id, values }, { onSuccess: () => setNotice('Perubahan webhook tersimpan dan tercatat di Audit Trail.') })
    } else {
      create.mutate(values, {
        onSuccess: (res) => {
          setSecretValue(res.secret)
          setNotice('Webhook dibuat dan langsung aktif.')
        },
      })
    }
  }

  const onToggleActive = () => {
    if (!editing) return
    toggleActive.mutate(
      { webhookId: editing.id, active: !editing.is_active },
      { onSuccess: () => setNotice(editing.is_active ? 'Webhook dinonaktifkan -- pengiriman dihentikan, konfigurasi dan log tetap tersimpan.' : 'Webhook diaktifkan kembali.') },
    )
  }

  const onRegenerate = () => {
    if (!editing) return
    regenerate.mutate(editing.id, {
      onSuccess: (res) => {
        setSecretValue(res.secret)
        setNotice('Secret baru dibuat -- kunci lama langsung tidak berlaku.')
      },
    })
  }

  const onTest = () => {
    if (!editing) return
    test.mutate(editing.id, {
      onSuccess: (res) =>
        setNotice(res.delivered ? `Payload tes dikirim -- respons berhasil dalam ${res.duration_ms} ms. Tercatat di tab Log Pengiriman.` : `Payload tes dikirim tapi endpoint tidak merespons sukses (${res.duration_ms} ms). Tercatat di tab Log Pengiriman.`),
    })
  }

  const onDelete = () => {
    if (!editing) return
    remove.mutate(editing.id, { onSuccess: handleClose })
  }

  const saveError = (isEdit ? update.error : create.error) instanceof ApiError ? ((isEdit ? update.error : create.error) as ApiError) : null
  const testRateLimited = test.error instanceof ApiError && test.error.code === 'RATE_LIMITED'
  const testRetryAfter = testRateLimited ? ((test.error as ApiError).details as { retry_after?: number } | undefined) : undefined

  const saving = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? editing.name : 'Daftarkan endpoint eksternal'}</DialogTitle>
          <p className="mt-1 text-sm text-text-muted">
            Endpoint wajib HTTPS. Setiap payload ditandatangani HMAC-SHA256 melalui header X-Prodo-Signature.
          </p>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-300px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          {secretValue && (
            <div className="flex flex-col gap-2 border border-amber p-3.5">
              <div className="font-mono text-[9px] tracking-[0.14em] text-amber">HMAC SECRET KEY -- DITAMPILKAN SATU KALI</div>
              <div className="break-all border border-line-strong bg-input-bg p-2.5 font-mono text-[12.5px] text-text-bone">{secretValue}</div>
              <div className="font-mono text-[9px] leading-relaxed text-text-muted">
                Salin dan simpan sekarang. Kunci ini tidak dapat dilihat ulang -- hanya dapat di-regenerate, dan kunci lama langsung tidak berlaku.
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-text-dim">NAMA DESKRIPTIF</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setFormError(false)
              }}
              placeholder="ERP Sync — order status"
              className={cn(
                'w-full border bg-input-bg px-3 py-2.5 font-mono text-[12.5px] text-text-bone outline-none focus-visible:border-signal',
                formError && !name.trim() ? 'border-destructive' : 'border-line-strong',
              )}
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-text-dim">URL ENDPOINT (HTTPS)</label>
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value.replace(/\s/g, ''))
                setFormError(false)
              }}
              placeholder="https://erp.acme.co.id/hooks/prodo"
              className={cn(
                'w-full border bg-input-bg px-3 py-2.5 font-mono text-[12.5px] text-text-bone outline-none focus-visible:border-signal',
                urlInvalid || (formError && !url.trim()) ? 'border-destructive' : 'border-line-strong',
              )}
            />
            {urlInvalid && <p className="mt-1.5 text-[9.5px] leading-relaxed text-destructive">⚠ Endpoint harus memakai HTTPS. URL non-HTTPS ditolak sistem.</p>}
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-text-dim">CAKUPAN</label>
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full border border-line-strong bg-input-bg px-3 py-2.5 font-mono text-[11.5px] text-text-bone outline-none focus-visible:border-signal"
            >
              <option value="">Seluruh grup</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="font-mono text-[9px] tracking-[0.14em] text-text-dim">EVENT TRIGGER</label>
              <span className={cn('font-mono text-[9px]', events.length ? 'text-mint' : 'text-text-muted')}>{events.length} EVENT DIPILIH</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUPPORTED_WEBHOOK_EVENTS.map((e) => {
                const on = events.includes(e)
                return (
                  <div
                    key={e}
                    onClick={() => {
                      toggleEvent(e)
                      setFormError(false)
                    }}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 border px-3 py-2.5 hover:border-signal',
                      on ? 'border-signal bg-signal/10' : 'border-line-strong',
                    )}
                  >
                    <span className={cn('h-3 w-3 flex-shrink-0 border', on ? 'border-signal bg-signal' : 'border-line-strong')} />
                    <span className={cn('font-mono text-[10px]', on ? 'text-signal' : 'text-text-bone')}>{e}</span>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 font-mono text-[8.5px] leading-relaxed text-text-dim">
              7 event lain dari desain (task.*, comment.created, rule.executed) belum tersedia -- fitur task/comment/rule automation belum dibangun.
            </p>
          </div>

          {isEdit && editing && (
            <div className="flex flex-col gap-3 border-t border-line pt-4">
              <div className="font-mono text-[9px] tracking-[0.14em] text-text-dim">STATUS &amp; KEAMANAN</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onToggleActive}
                  disabled={toggleActive.isPending}
                  className={cn('border px-3.5 py-2 font-mono text-[9.5px] font-semibold tracking-[0.06em]', editing.is_active ? 'border-amber text-amber' : 'border-mint text-mint')}
                >
                  {editing.is_active ? 'NONAKTIFKAN' : 'AKTIFKAN'}
                </button>
                <button
                  type="button"
                  onClick={onRegenerate}
                  disabled={regenerate.isPending}
                  className="border border-amber px-3.5 py-2 font-mono text-[9.5px] font-semibold tracking-[0.06em] text-amber"
                >
                  REGENERATE SECRET
                </button>
                <button
                  type="button"
                  onClick={onTest}
                  disabled={test.isPending}
                  className="border border-mint px-3.5 py-2 font-mono text-[9.5px] font-semibold tracking-[0.06em] text-mint"
                >
                  KIRIM TES
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={remove.isPending}
                  className="border border-destructive px-3.5 py-2 font-mono text-[9.5px] font-semibold tracking-[0.06em] text-destructive"
                >
                  HAPUS WEBHOOK
                </button>
              </div>
              <p className="font-mono text-[9px] leading-relaxed text-text-dim">Menonaktifkan menghentikan pengiriman tanpa menghapus konfigurasi dan riwayat log.</p>
            </div>
          )}

          {notice && <p className="border border-mint p-2.5 font-mono text-[10px] leading-relaxed text-mint">✓ {notice}</p>}
          {testRateLimited && (
            <p className="border border-destructive p-2.5 font-mono text-[10px] leading-relaxed text-destructive">
              ⚠ HTTP 429 -- Batas pengiriman tes webhook terlampaui (maks 5 permintaan/menit).
              {testRetryAfter?.retry_after ? ` Coba lagi dalam ${testRetryAfter.retry_after} detik.` : ''}
            </p>
          )}
          {saveError && !testRateLimited && <p className="text-[11px] text-destructive">{saveError.message}</p>}
          {formError && (
            <p className="border border-destructive p-2.5 font-mono text-[10px] leading-relaxed text-destructive">
              ⚠ Lengkapi nama, URL HTTPS yang valid, dan minimal satu event trigger.
            </p>
          )}

          <p className="border-t border-line pt-3.5 font-mono text-[9px] leading-relaxed text-text-dim">
            Pengiriman gagal diulang otomatis 3× (1, 5, 15 menit). Setelah seluruh retry gagal, Group Admin menerima notifikasi berisi nama webhook, endpoint, event, dan payload.
            <br />
            Seluruh perubahan konfigurasi webhook tercatat di Audit Trail.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" disabled={saving} onClick={onSave} className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]">
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Webhook'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
