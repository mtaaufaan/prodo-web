import { useRef } from 'react'

// Grid1Pager -- paginasi standar "Grid 1": ← Sebelumnya / Halaman [input] / N
// · {total} data / Ke / Berikutnya →. Input + Enter atau tombol Ke melompat
// ke halaman (di luar rentang dijepit ke batas); tombol dinonaktifkan di
// halaman pertama/terakhir; seluruh baris disembunyikan bila data muat di
// satu halaman. Data dipotong klien (slice) oleh pemanggil.
interface Grid1PagerProps {
  page: number
  perPage: number
  total: number
  onPage: (page: number) => void
}

export default function Grid1Pager({ page, perPage, total, onPage }: Grid1PagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  if (total <= perPage) return null

  const totalPages = Math.ceil(total / perPage)
  const current = Math.min(Math.max(1, page), totalPages)
  const jump = (raw: string) => {
    const n = parseInt(raw, 10)
    if (Number.isFinite(n)) onPage(Math.min(totalPages, Math.max(1, n)))
  }
  const btn = 'border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase text-text-muted disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
      <button type="button" onClick={() => onPage(current - 1)} disabled={current <= 1} className={btn}>
        ← Sblm
      </button>
      <span className="flex flex-wrap items-center justify-center gap-1.5 font-mono text-[10px] text-text-dim">
        Halaman
        <input
          key={current}
          ref={inputRef}
          type="number"
          min={1}
          max={totalPages}
          defaultValue={current}
          onKeyDown={(e) => e.key === 'Enter' && jump(e.currentTarget.value)}
          className="w-11 border border-line-strong bg-input-bg px-1 py-0.5 text-center font-mono text-[10px] text-text-body outline-none"
          aria-label="Nomor halaman"
        />
        / {totalPages} · {total} data
        <button type="button" onClick={() => jump(inputRef.current?.value ?? '')} className="border border-line-strong px-1.5 py-0.5 font-mono text-[9px] uppercase text-text-muted">
          Ke
        </button>
      </span>
      <button type="button" onClick={() => onPage(current + 1)} disabled={current >= totalPages} className={btn}>
        Brkt →
      </button>
    </div>
  )
}
