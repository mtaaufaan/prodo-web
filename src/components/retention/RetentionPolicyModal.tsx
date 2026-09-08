import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useBulkUpdateRetentionPolicy } from '@/features/retention/hooks'
import type { RetentionScheduleItem } from '@/features/retention/types'
import type { Organization } from '@/features/organizations/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

interface RetentionPolicyModalProps {
  open: boolean
  onClose: () => void
  groupId: string
  orgs: Organization[]
  schedule: RetentionScheduleItem[]
  retentionMin: number
  retentionMax: number
  tierName: string
}

// Data Retention (desain "GA Data Retention.dc.html" modal "Atur
// Kebijakan") -- input bulk per-org (hari), reuse pola persis
// AllocationModal (bulk kuota) -- rate-limit 3x/menit SUNGGUHAN
// (server-side, PUT /groups/:groupId/retention-policy). Rentang min/max
// SAMA untuk seluruh organisasi dalam satu grup (tier grup, bukan per-org
// seperti kuota) -- lihat GroupDataRetentionPage.
export default function RetentionPolicyModal({
  open,
  onClose,
  groupId,
  orgs,
  schedule,
  retentionMin,
  retentionMax,
  tierName,
}: RetentionPolicyModalProps) {
  const [draft, setDraft] = useState<Record<string, string>>({})
  const bulkUpdate = useBulkUpdateRetentionPolicy(groupId)

  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {}
      orgs.forEach((o) => {
        initial[o.id] = String(o.retention_days)
      })
      setDraft(initial)
    }
  }, [open, orgs])

  const handleClose = () => {
    bulkUpdate.reset()
    onClose()
  }

  const pendingCountByOrg = (orgName: string) => schedule.filter((it) => it.org_name === orgName).length

  const rows = orgs.map((o) => {
    const raw = draft[o.id] ?? ''
    const days = parseInt(raw, 10)
    const valid = Number.isFinite(days) && days >= retentionMin && days <= retentionMax
    return { org: o, raw, days, valid }
  })

  const hasRowError = rows.some((r) => !r.valid)
  const canSubmit = !hasRowError && rows.length > 0

  const errorDetails = bulkUpdate.error instanceof ApiError ? (bulkUpdate.error.details as Record<string, string> | undefined) : undefined
  const rateLimited = bulkUpdate.error instanceof ApiError && bulkUpdate.error.code === 'RATE_LIMITED'
  const retryAfter = rateLimited ? ((bulkUpdate.error as ApiError).details as { retry_after?: number } | undefined) : undefined
  const genericErrorMessage = bulkUpdate.error instanceof ApiError && !rateLimited && !errorDetails ? bulkUpdate.error.message : null

  const onSave = () => {
    if (!canSubmit) return
    const retentions: Record<string, number> = {}
    rows.forEach((r) => {
      retentions[r.org.id] = r.days
    })
    bulkUpdate.mutate(retentions, { onSuccess: handleClose })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Atur Kebijakan Retensi</DialogTitle>
          <p className="mt-1 text-sm text-text-muted">
            Berlaku untuk workspace dan project yang dihapus. Batas Platform Admin ({retentionMin}-{retentionMax} hari, tier{' '}
            {tierName.toUpperCase()}). Retensi organisasi nonaktif (90 hari) ditetapkan platform dan tidak dapat diubah.
          </p>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-300px)] flex-col gap-3 overflow-y-auto px-5 py-5">
          {rateLimited && (
            <p className="border border-destructive p-3 text-[11px] text-destructive">
              ⚠ Terlalu banyak perubahan kebijakan retensi dalam waktu singkat (maks 3 permintaan/menit).
              {retryAfter?.retry_after ? ` Coba lagi dalam ${retryAfter.retry_after} detik.` : ''}
            </p>
          )}
          {genericErrorMessage && <p className="text-[11px] text-destructive">{genericErrorMessage}</p>}

          {rows.map((r) => (
            <div
              key={r.org.id}
              className={cn('flex items-center justify-between gap-4 border p-3', !r.valid || errorDetails?.[r.org.id] ? 'border-destructive' : 'border-line')}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-text-body">{r.org.name}</div>
                <div className="font-mono text-[10px] text-text-muted">
                  {pendingCountByOrg(r.org.name)} ITEM TERTUNDA · SAAT INI {r.org.retention_days} HARI · BATAS {retentionMin}-{retentionMax}
                </div>
                {!r.valid && (
                  <p className="mt-1 text-[10px] text-destructive">⚠ Harus antara {retentionMin} dan {retentionMax} hari.</p>
                )}
                {errorDetails?.[r.org.id] && <p className="mt-1 text-[10px] text-destructive">⚠ {errorDetails[r.org.id]}</p>}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <input
                  type="number"
                  step="1"
                  value={r.raw}
                  onChange={(e) => setDraft((d) => ({ ...d, [r.org.id]: e.target.value.replace(/\D/g, '') }))}
                  className="w-20 border border-line-strong bg-input-bg px-2 py-2 text-right font-mono text-sm text-text-body outline-none focus-visible:border-signal"
                />
                <span className="font-mono text-[10px] text-text-muted">HARI</span>
              </div>
            </div>
          ))}

          <p className="border-t border-line pt-3 font-mono text-[9px] leading-relaxed text-text-dim">
            Memperpendek retensi mempercepat jadwal penghapusan item yang sudah tertunda. Notifikasi in-app dan email
            dikirim ke Group Admin pada hari ke-60 dan ke-80 sejak organisasi dinonaktifkan. Perubahan kebijakan
            tercatat di Audit Trail grup.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={!canSubmit || bulkUpdate.isPending}
            onClick={onSave}
            className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]"
          >
            {bulkUpdate.isPending ? 'Menyimpan...' : 'Simpan Kebijakan'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
