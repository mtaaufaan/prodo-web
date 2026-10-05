import { pageWindow } from '@/features/pic-groups/rows'
import { cn } from '@/lib/utils'

// GridPager -- bar paginasi standar "Grid 1" (desain "AW Rule Automation.dc.html":
// info rentang, pilihan N / HAL, ◄ SBLM, nomor halaman jendela 5, BRKT ►).
interface GridPagerProps {
  page: number
  perPage: number
  total: number
  unit: string
  perPageOptions?: number[]
  onPage: (page: number) => void
  onPerPage: (perPage: number) => void
}

export default function GridPager({ page, perPage, total, unit, perPageOptions = [10, 25, 50], onPage, onPerPage }: GridPagerProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * perPage
  const info = total === 0 ? `0 ${unit}` : `${start + 1}–${Math.min(start + perPage, total)} DARI ${total} ${unit}`

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-t border-line bg-raised-2 px-3.5 py-[9px]">
      <span className="font-mono text-[9px] tracking-[0.08em] text-text-dim">{info}</span>
      <select
        value={perPage}
        onChange={(e) => onPerPage(Number(e.target.value))}
        className="border border-line-strong bg-input-bg px-[7px] py-[5px] font-mono text-[9px] text-text-bone outline-none"
      >
        {perPageOptions.map((o) => (
          <option key={o} value={o}>
            {o} / HAL
          </option>
        ))}
      </select>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => onPage(current - 1)}
          className="border border-line-strong px-[11px] py-1.5 font-mono text-[10px] text-text-muted disabled:opacity-40"
        >
          ◄ SBLM
        </button>
        {pageWindow(current, totalPages).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={cn(
              'min-w-[30px] border px-[9px] py-1.5 text-center font-mono text-[10px]',
              p === current ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={current >= totalPages}
          onClick={() => onPage(current + 1)}
          className="border border-line-strong px-[11px] py-1.5 font-mono text-[10px] text-text-muted disabled:opacity-40"
        >
          BRKT ►
        </button>
      </div>
    </div>
  )
}
