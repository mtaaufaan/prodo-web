import { useState } from 'react'

import type { FeedType, MergedRow } from '@/features/workspace-audit/rows'
import { cn } from '@/lib/utils'

const TYPE_TONE: Record<FeedType, string> = {
  CREATE: 'border-mint text-mint',
  UPDATE: 'border-signal text-signal',
  DELETE: 'border-destructive text-destructive',
  ACCESS: 'border-amber text-amber',
  RULE: 'border-signal text-signal',
  GAGAL: 'border-destructive text-destructive',
}

// Satu baris Audit Trail (pola PERSIS GroupAuditTrailPage): klik untuk membuka
// nilai sebelum/sesudah + forensik (IP, request path).
export default function AuditEntryRow({ row }: { row: MergedRow }) {
  const [expanded, setExpanded] = useState(false)
  const time = new Date(row.loggedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="border-t border-line">
      <div onClick={() => setExpanded((v) => !v)} className="grid cursor-pointer grid-cols-[0.9fr_2.1fr_0.7fr_1.1fr] items-start gap-3 px-4 py-3 hover:bg-raised-2">
        <span className="font-mono text-[9.5px] text-text-muted">{time}</span>
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cn('mt-0.5 flex-shrink-0 border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold tracking-[0.04em]', TYPE_TONE[row.type])}>{row.type}</span>
          <div className="min-w-0">
            <div className="text-[12.5px] text-text-bone">{row.text}</div>
            <div className="mt-0.5 font-mono text-[9px] text-text-muted">{row.scope}</div>
          </div>
        </div>
        <span className="truncate font-mono text-[9.5px] text-text-muted">{row.actorName}</span>
        <div className="min-w-0 font-mono text-[9px] text-text-muted">
          <div>{row.actorIp ?? '—'}</div>
          {row.requestPath && <div className="mt-0.5 break-all text-text-dim">{row.requestPath}</div>}
        </div>
      </div>
      {expanded && (
        <div className="flex flex-col gap-2.5 px-4 pb-4">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="border border-line-strong p-2.5">
              <div className="font-mono text-[8.5px] tracking-[0.1em] text-text-dim">NILAI SEBELUM</div>
              <div className="mt-1.5 whitespace-pre-wrap break-all font-mono text-[10.5px] text-destructive">{row.before || '—'}</div>
            </div>
            <div className="border border-line-strong p-2.5">
              <div className="font-mono text-[8.5px] tracking-[0.1em] text-text-dim">NILAI SESUDAH</div>
              <div className="mt-1.5 whitespace-pre-wrap break-all font-mono text-[10.5px] text-mint">{row.after || '—'}</div>
            </div>
          </div>
          <div className="break-all font-mono text-[9px] leading-relaxed text-text-dim">
            ID ENTRI {row.id.slice(0, 12)} · AKTOR {row.actorName} · IP {row.actorIp ?? '—'}
            {row.requestPath && <> · {row.requestPath}</>} · entri append-only, tidak dapat diubah
          </div>
        </div>
      )}
    </div>
  )
}
