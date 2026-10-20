import { useState } from 'react'

import { validateDecisionNote } from '@/features/approvals/approvalRules'
import { NOTE_MAX, type ApprovalDecision } from '@/features/approvals/types'
import { cn } from '@/lib/utils'

// ApprovalDecisionModal -- "TM Konfirmasi Approval.dc.html": overlay + kartu beraksen mint (setuju) / merah
// (tolak), kotak dampak, catatan (opsional untuk setuju, ALASAN wajib >= 5 karakter untuk tolak).
// Komponen terpisah: dipakai ulang Task Detail (S7A-09). onConfirm mengembalikan pesan galat server
// ('' = sukses) supaya modal tetap terbuka saat gagal.
interface ApprovalDecisionModalProps {
  mode: ApprovalDecision
  code: string
  taskTitle: string
  pic: string
  onConfirm: (note: string) => Promise<string>
  onClose: () => void
}

export default function ApprovalDecisionModal({ mode, code, taskTitle, pic, onConfirm, onClose }: ApprovalDecisionModalProps) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const ok = mode === 'approve'

  const submit = async () => {
    const invalid = validateDecisionNote(mode, note)
    if (invalid) {
      setError(invalid)
      return
    }
    setPending(true)
    const serverError = await onConfirm(note.trim())
    setPending(false)
    if (serverError) setError(serverError)
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[60] flex items-center justify-center bg-[oklch(0.1_0.008_60/0.68)] p-7">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${ok ? 'Setujui' : 'Tolak'} ${code}`}
        className={cn('flex max-h-[calc(100vh-56px)] w-[520px] max-w-full flex-col overflow-auto border bg-panel', ok ? 'border-mint' : 'border-red')}
      >
        <div className="flex items-start gap-3.5 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className={cn('mb-1.5 font-mono text-[9px] tracking-[0.16em]', ok ? 'text-mint' : 'text-red')}>KEPUTUSAN APPROVAL</div>
            <div className="text-[15px] font-bold leading-[1.35]">
              {ok ? 'Setujui ' : 'Tolak '}
              {code || 'task'}
              {taskTitle ? ` — ${taskTitle}` : ''}
            </div>
            <div className="mt-[5px] font-mono text-[9.5px] leading-[1.6] text-text-muted">Status saat ini UNDER REVIEW · PIC {pic || '—'}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="font-mono text-[14px] leading-none text-text-muted hover:text-text-bone">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3.5 px-5 py-[18px]">
          <div
            className={cn(
              'border px-[13px] py-3 font-mono text-[9.5px] leading-[1.8] text-text-body',
              ok ? 'border-mint bg-[oklch(0.21_0.03_165)]' : 'border-red bg-[oklch(0.21_0.03_25)]',
            )}
          >
            {ok
              ? 'Task dipindahkan ke DONE. Assignee menerima notifikasi bahwa hasilnya disetujui.'
              : 'Task dikembalikan ke IN PROGRESS. Assignee menerima notifikasi berikut alasan penolakan Anda.'}
          </div>
          <div>
            <label htmlFor="approval-note" className="mb-[7px] block font-mono text-[9px] tracking-[0.14em] text-text-dim">
              {ok ? 'CATATAN · OPSIONAL' : 'ALASAN PENOLAKAN · WAJIB'}
            </label>
            <textarea
              id="approval-note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value.slice(0, NOTE_MAX))
                setError('')
              }}
              placeholder={ok ? 'Hasil sesuai acceptance criteria.' : 'Jelaskan bagian yang perlu diperbaiki…'}
              className={cn('min-h-[86px] w-full resize-y border bg-input-bg px-[11px] py-2.5 text-[12px] leading-[1.6] text-text-bone outline-none', error ? 'border-red' : 'border-line')}
            />
            <div className="mt-1.5 text-right font-mono text-[8.5px] text-text-dim">
              {note.length} / {NOTE_MAX}
            </div>
          </div>
          {error && <div className="border border-red px-3 py-2.5 font-mono text-[9.5px] leading-[1.7] text-red">⚠ {error}</div>}
        </div>
        <div className="flex gap-2.5 border-t border-line px-5 py-3.5">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className={cn('px-[19px] py-[11px] font-mono text-[10.5px] font-bold tracking-[0.08em] text-[oklch(0.15_0.008_60)] disabled:opacity-60', ok ? 'bg-mint' : 'bg-red')}
          >
            {ok ? '✓ SETUJUI TASK' : '✕ TOLAK TASK'}
          </button>
          <button type="button" onClick={onClose} className="border border-line-strong px-[19px] py-[11px] font-mono text-[10.5px] tracking-[0.08em] text-text-muted">
            BATAL
          </button>
        </div>
      </div>
    </div>
  )
}
