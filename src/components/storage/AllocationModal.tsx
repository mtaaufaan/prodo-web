import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Organization } from '@/features/organizations/types'
import { useBulkUpdateStorageAllocation } from '@/features/storage/hooks'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const GB = 1024 * 1024 * 1024

interface AllocationModalProps {
  open: boolean
  onClose: () => void
  groupId: string
  orgs: Organization[]
  capBytes: number
}

// S4G-07, Track S4G (desain "GA Storage Quota.dc.html" modal "Atur Alokasi
// Kuota") -- input bulk per-org (GB), validasi live per baris (wajib diisi,
// <= maks Platform Admin, >= terpakai) + total <= plafon grup, SEBELUM
// submit ke PUT /groups/:groupId/storage-allocation. Rate-limit 3x/menit
// SUNGGUHAN (server-side, respons 429 RATE_LIMITED) -- beda dari rate-limit
// dekoratif Create Org/Workspace, ditampilkan apa adanya di sini.
export default function AllocationModal({ open, onClose, groupId, orgs, capBytes }: AllocationModalProps) {
  const [draft, setDraft] = useState<Record<string, string>>({})
  const bulkUpdate = useBulkUpdateStorageAllocation(groupId)

  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {}
      orgs.forEach((o) => {
        initial[o.id] = (o.storage_quota_bytes / GB).toFixed(1)
      })
      setDraft(initial)
    }
  }, [open, orgs])

  const handleClose = () => {
    bulkUpdate.reset()
    onClose()
  }

  const rows = orgs.map((o) => {
    const valueGB = parseFloat(draft[o.id] ?? '')
    const valid = Number.isFinite(valueGB) && valueGB > 0
    const bytes = valid ? Math.round(valueGB * GB) : 0
    const overMax = valid && bytes > o.storage_max_bytes
    const belowUsed = valid && bytes < o.storage_used_bytes
    const usedPct = valid && bytes > 0 ? Math.min(100, Math.round((o.storage_used_bytes / bytes) * 100)) : 0
    return { org: o, valueGB: draft[o.id] ?? '', bytes, valid, overMax, belowUsed, usedPct }
  })

  const draftTotalBytes = rows.reduce((sum, r) => sum + (r.valid ? r.bytes : 0), 0)
  const overCap = capBytes > 0 && draftTotalBytes > capBytes
  const hasRowError = rows.some((r) => !r.valid || r.overMax || r.belowUsed)
  const canSubmit = !hasRowError && !overCap && rows.length > 0

  const errorDetails = bulkUpdate.error instanceof ApiError ? (bulkUpdate.error.details as Record<string, string> | undefined) : undefined
  const rateLimited = bulkUpdate.error instanceof ApiError && bulkUpdate.error.code === 'RATE_LIMITED'
  const retryAfter = rateLimited ? (bulkUpdate.error as ApiError).details as { retry_after?: number } | undefined : undefined
  const genericErrorMessage = bulkUpdate.error instanceof ApiError && !rateLimited && !errorDetails ? bulkUpdate.error.message : null

  const onSave = () => {
    if (!canSubmit) return
    const allocations: Record<string, number> = {}
    rows.forEach((r) => {
      allocations[r.org.id] = r.bytes
    })
    bulkUpdate.mutate(allocations, { onSuccess: handleClose })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Atur Alokasi Kuota</DialogTitle>
          <p className="mt-1 text-sm text-text-muted">
            Distribusi {(capBytes / GB).toFixed(0)} GB plafon grup. Alokasi tiap organisasi dibatasi maksimum dari Platform
            Admin.
          </p>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-300px)] flex-col gap-3 overflow-y-auto px-5 py-5">
          {rateLimited && (
            <p className="border border-destructive p-3 text-[11px] text-destructive">
              ⚠ Terlalu banyak perubahan alokasi dalam waktu singkat (maks 3 permintaan/menit).
              {retryAfter?.retry_after ? ` Coba lagi dalam ${retryAfter.retry_after} detik.` : ''}
            </p>
          )}
          {genericErrorMessage && <p className="text-[11px] text-destructive">{genericErrorMessage}</p>}
          {errorDetails?._total && <p className="border border-destructive p-3 text-[11px] text-destructive">⚠ {errorDetails._total}</p>}

          {rows.map((r) => (
            <div
              key={r.org.id}
              className={cn('flex flex-col gap-2 border p-3', r.overMax || r.belowUsed || !r.valid || errorDetails?.[r.org.id] ? 'border-destructive' : 'border-line')}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text-body">{r.org.name}</div>
                  <div className="font-mono text-[10px] text-text-muted">
                    TERPAKAI {(r.org.storage_used_bytes / GB).toFixed(1)} GB · MAKS {(r.org.storage_max_bytes / GB).toFixed(0)} GB
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={draft[r.org.id] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [r.org.id]: e.target.value }))}
                    className="w-24 border border-line-strong bg-input-bg px-2 py-2 text-right font-mono text-sm text-text-body outline-none focus-visible:border-signal"
                  />
                  <span className="font-mono text-[10px] text-text-muted">GB</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-line-subtle">
                  <div
                    className={cn('h-full', r.usedPct >= 95 ? 'bg-destructive' : r.usedPct >= 80 ? 'bg-amber' : 'bg-mint')}
                    style={{ width: `${r.usedPct}%` }}
                  />
                </div>
                <span className="font-mono text-[9px] text-text-muted">{r.usedPct}% terpakai</span>
              </div>
              {!r.valid && <p className="text-[10px] text-destructive">Alokasi wajib diisi.</p>}
              {r.valid && r.overMax && (
                <p className="text-[10px] text-destructive">Melebihi batas maksimum Platform Admin ({(r.org.storage_max_bytes / GB).toFixed(0)} GB).</p>
              )}
              {r.valid && r.belowUsed && (
                <p className="text-[10px] text-destructive">Di bawah pemakaian saat ini ({(r.org.storage_used_bytes / GB).toFixed(1)} GB).</p>
              )}
              {errorDetails?.[r.org.id] && <p className="text-[10px] text-destructive">⚠ {errorDetails[r.org.id]}</p>}
            </div>
          ))}

          <div className="border-t border-line pt-3">
            <div className="flex items-center justify-between font-mono text-[10.5px]">
              <span className="text-text-muted">TOTAL ALOKASI</span>
              <span className={cn('font-semibold', overCap ? 'text-destructive' : 'text-mint')}>
                {(draftTotalBytes / GB).toFixed(1)} / {(capBytes / GB).toFixed(0)} GB
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-line-subtle">
              <div
                className={cn('h-full', overCap ? 'bg-destructive' : 'bg-signal')}
                style={{ width: `${capBytes > 0 ? Math.min(100, (draftTotalBytes / capBytes) * 100) : 0}%` }}
              />
            </div>
            {overCap && (
              <p className="mt-2 text-[10px] text-destructive">
                ⚠ Total alokasi melebihi plafon grup {(capBytes / GB).toFixed(0)} GB. Kurangi alokasi atau ajukan kenaikan
                tier ke Platform Admin.
              </p>
            )}
          </div>

          <p className="border-t border-line pt-3 font-mono text-[9px] leading-relaxed text-text-dim">
            Notifikasi otomatis dikirim ke Group Admin saat pemakaian organisasi mencapai 80% dan 95% dari alokasi.
            Perubahan alokasi tercatat di Audit Trail grup.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" disabled={!canSubmit || bulkUpdate.isPending} onClick={onSave} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            {bulkUpdate.isPending ? 'Menyimpan...' : 'Simpan Alokasi'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
