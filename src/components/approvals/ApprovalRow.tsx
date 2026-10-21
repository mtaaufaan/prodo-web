import { useEffect, useRef } from 'react'

import { DECISION_BADGE } from '@/features/approvals/approvalRules'
import type { ApprovalDecision, ApprovalItem } from '@/features/approvals/types'
import { metaLine, progressInfo } from '@/features/my-tasks/myTaskStats'
import { statusColorClasses, type TaskPriority } from '@/features/tasks/types'
import { cn } from '@/lib/utils'

const PRIORITY_TEXT: Record<TaskPriority, string> = {
  low: 'text-text-muted',
  medium: 'text-blue',
  high: 'text-amber',
  critical: 'text-red',
}

interface ApprovalRowProps {
  item: ApprovalItem
  // canDecide -- kemampuan approve_task; baris yang sudah diputuskan selalu terkunci.
  canDecide: boolean
  onDecide: (item: ApprovalItem, mode: ApprovalDecision) => void
  // highlighted -- baris yang dituju notifikasi (?task=): disorot dan digulir ke tampilan (S7A-11).
  highlighted?: boolean
}

// Satu baris "TM Antrean Approval.dc.html": kode, judul, meta, badge status/prioritas, bar progres sub-task +
// jam, aksi ✓ SETUJUI / ✕ TOLAK; baris yang sudah diputuskan menampilkan badge keputusan dan 🔒.
export default function ApprovalRow({ item, canDecide, onDecide, highlighted = false }: ApprovalRowProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView?.({ block: 'center' })
  }, [highlighted])
  const decided = item.decision !== null
  const badge = decided ? DECISION_BADGE[item.decision as 'approved' | 'rejected'] : null
  const status = statusColorClasses(item.status_color)
  const progress = progressInfo(item)
  const showActions = canDecide && !decided

  return (
    <div
      ref={ref}
      data-highlighted={highlighted || undefined}
      className={cn('flex flex-col gap-[9px] border-t border-line px-[15px] py-[13px] first:border-t-0', highlighted && 'border-l-2 border-l-signal bg-signal/5')}
    >
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 pt-0.5 font-mono text-[8.5px] text-text-muted">{item.task_code}</span>
        <div className="min-w-0 flex-1 leading-[1.4]">
          <div className="text-[13px] text-text-bone">{item.title}</div>
          <div className="mt-[5px] font-mono text-[8.5px] leading-[1.7] text-text-dim">{metaLine(item)}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-[5px]">
          <span className={cn('border px-1.5 py-[3px] font-mono text-[8.5px] font-semibold', badge ? [badge.text, badge.border] : [status.text, status.border])}>
            {badge ? badge.label : item.status_name}
          </span>
          <span className={cn('font-mono text-[8.5px] font-semibold uppercase', PRIORITY_TEXT[item.priority])}>{item.priority}</span>
        </div>
      </div>

      {progress.show && (
        <div>
          <div className="mb-[5px] flex gap-[9px]">
            <span className="font-mono text-[8.5px] text-text-muted">{progress.label}</span>
            <span className={cn('ml-auto font-mono text-[8.5px]', progress.overBudget ? 'text-red' : 'text-text-muted')}>{progress.hours}</span>
          </div>
          <div className="h-1.5 bg-input-bg">
            <div className={cn('h-full', progress.done ? 'bg-mint' : 'bg-blue')} style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {showActions && (
          <>
            <button type="button" onClick={() => onDecide(item, 'approve')} className="border border-mint px-[9px] py-[5px] font-mono text-[9.5px] text-mint">
              ✓ SETUJUI
            </button>
            <button type="button" onClick={() => onDecide(item, 'reject')} className="border border-red px-[9px] py-[5px] font-mono text-[9.5px] text-red">
              ✕ TOLAK
            </button>
          </>
        )}
        {!showActions && (
          <span className="font-mono text-[9px] text-text-dim">🔒 {decided ? 'Sudah diputuskan' : 'Hanya baca — role Anda tidak dapat mengubah task ini'}</span>
        )}
      </div>
    </div>
  )
}
