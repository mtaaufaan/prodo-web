import { useState } from 'react'

import { countMentions, validateComment } from '@/features/my-tasks/myTaskStats'
import { COMMENT_MAX } from '@/features/my-tasks/types'
import { cn } from '@/lib/utils'

// CommentModal -- "TM Komentar.dc.html": overlay + kartu border biru, textarea
// 1000 karakter, hitungan, mention @nama, validasi tidak kosong.
interface CommentModalProps {
  code: string
  taskTitle: string
  // Mengembalikan pesan galat dari server ('' = sukses) supaya modal bisa tetap terbuka.
  onSubmit: (text: string) => Promise<string>
  onClose: () => void
}

export default function CommentModal({ code, taskTitle, onSubmit, onClose }: CommentModalProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const mentions = countMentions(text)

  const submit = async () => {
    const invalid = validateComment(text)
    if (invalid) {
      setError(invalid)
      return
    }
    setPending(true)
    const serverError = await onSubmit(text.trim())
    setPending(false)
    if (serverError) setError(serverError)
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[60] flex items-center justify-center bg-[oklch(0.1_0.008_60/0.68)] p-7">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Komentar pada ${code}`}
        className="flex max-h-[calc(100vh-56px)] w-[520px] max-w-full flex-col overflow-auto border border-blue bg-panel"
      >
        <div className="flex items-start gap-3.5 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 font-mono text-[9px] tracking-[0.16em] text-blue">KOMENTAR TASK</div>
            <div className="text-[15px] font-bold leading-[1.35]">Komentar pada {code}</div>
            <div className="mt-[5px] font-mono text-[9.5px] leading-[1.6] text-text-muted">{taskTitle || '—'}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="font-mono text-[14px] leading-none text-text-muted hover:text-text-bone">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3.5 px-5 py-[18px]">
          <div>
            <label htmlFor="comment-text" className="mb-[7px] block font-mono text-[9px] tracking-[0.14em] text-text-dim">
              TULIS KOMENTAR
            </label>
            <textarea
              id="comment-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value.slice(0, COMMENT_MAX))
                setError('')
              }}
              placeholder="Ketik komentar… gunakan @nama untuk mention"
              className={cn(
                'min-h-[110px] w-full resize-y border bg-input-bg px-[11px] py-2.5 text-[12.5px] leading-[1.6] text-text-bone outline-none',
                error ? 'border-red' : 'border-line',
              )}
            />
            <div className="mt-1.5 flex gap-2.5 font-mono text-[8.5px] text-text-dim">
              <span>{mentions ? `${mentions} mention · notifikasi mengikuti cooldown workspace` : 'Mention @nama mengikuti cooldown workspace'}</span>
              <span className="ml-auto">
                {text.length} / {COMMENT_MAX}
              </span>
            </div>
          </div>
          {error && <div className="border border-red px-3 py-2.5 font-mono text-[9.5px] leading-[1.7] text-red">⚠ {error}</div>}
        </div>
        <div className="flex gap-2.5 border-t border-line px-5 py-3.5">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="bg-blue px-[19px] py-[11px] font-mono text-[10.5px] font-bold tracking-[0.08em] text-[oklch(0.15_0.008_60)] disabled:opacity-60"
          >
            KIRIM KOMENTAR
          </button>
          <button type="button" onClick={onClose} className="border border-line-strong px-[19px] py-[11px] font-mono text-[10.5px] tracking-[0.08em] text-text-muted">
            BATAL
          </button>
        </div>
      </div>
    </div>
  )
}
