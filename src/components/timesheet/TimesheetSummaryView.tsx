import { TONE_BG, TONE_TEXT, accuracyRow, statCards, statusBarRows } from '@/features/timesheet/analytics'
import type { ProjectTimesheet } from '@/features/timesheet/types'
import { statusColorClasses } from '@/features/tasks/types'
import { cn } from '@/lib/utils'

// Kartu statistik (4) -- dipakai tab Ringkasan dan Per-Member ("PM Timesheet.dc.html").
export function TimesheetStats({ data }: { data: ProjectTimesheet }) {
  return (
    <div className="flex flex-wrap gap-3 pb-3.5">
      {statCards(data).map((s) => (
        <div key={s.label} className="min-w-[104px] flex-1 border border-line bg-panel px-[15px] py-[13px]">
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">{s.label}</div>
          <div className={cn('mt-[5px] text-[23px] font-extrabold', TONE_TEXT[s.tone])}>{s.value}</div>
          <div className="mt-[5px] font-mono text-[8.5px] text-text-dim">{s.note}</div>
        </div>
      ))}
    </div>
  )
}

const PANEL_HEAD = 'border-b border-line px-[15px] py-[13px] font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim'

export default function TimesheetSummaryView({ data }: { data: ProjectTimesheet }) {
  const bars = statusBarRows(data.by_status)
  const rows = data.tasks.map(accuracyRow)
  return (
    <div className="flex min-h-0 flex-1 flex-wrap items-stretch gap-3.5 overflow-auto">
      <div className="flex min-w-[290px] flex-1 flex-col border border-line bg-panel">
        <div className={PANEL_HEAD}>Jam tercatat per status</div>
        <div className="flex flex-1 flex-col gap-3 overflow-auto px-[15px] py-3.5">
          {bars.map((b) => {
            const colors = b.colorToken === null ? null : statusColorClasses(b.colorToken)
            return (
              <div key={b.name}>
                <div className="mb-[5px] flex items-baseline gap-[9px]">
                  <span className={cn('min-w-0 flex-1 truncate font-mono text-[9.5px] font-semibold tracking-[0.04em]', colors ? colors.text : 'text-text-dim')}>{b.name}</span>
                  <span className="font-mono text-[9.5px] text-text-body">{b.hours}</span>
                  <span className="font-mono text-[8.5px] text-text-dim">{b.tasks}</span>
                </div>
                <div className="h-2 bg-bg-deep">
                  <div className={cn('h-full', colors ? colors.dot : 'bg-text-dim')} style={{ width: `${b.widthPct}%` }} />
                </div>
              </div>
            )
          })}
          {bars.length === 0 && <p className="font-mono text-[10px] text-text-dim">Belum ada status pada project ini.</p>}
        </div>
      </div>

      <div className="flex min-w-[290px] flex-1 flex-col border border-line bg-panel">
        <div className={PANEL_HEAD}>Akurasi estimasi per task</div>
        <div className="flex-1 overflow-auto">
          {rows.map((t) => (
            <div key={t.code} className="flex flex-col gap-1.5 border-t border-line px-[15px] py-[11px]">
              <div className="flex items-center gap-[9px]">
                <span className="font-mono text-[8.5px] text-text-dim">{t.code}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-text-bone">{t.title}</span>
                <span className={cn('whitespace-nowrap font-mono text-[9px] font-semibold', TONE_TEXT[t.tone])}>{t.delta}</span>
              </div>
              <div className="relative h-1.5 bg-bg-deep">
                <div className={cn('absolute inset-y-0 left-0', TONE_BG[t.tone])} style={{ width: `${t.widthPct}%` }} />
                <div className="absolute -bottom-0.5 -top-0.5 w-px bg-text-muted" style={{ left: `${t.markPct}%` }} />
              </div>
              <div className="font-mono text-[8.5px] text-text-dim">{t.meta}</div>
            </div>
          ))}
          {rows.length === 0 && <p className="px-[15px] py-6 text-center font-mono text-[10px] leading-[1.8] text-text-dim">Belum ada task berestimasi pada project ini.</p>}
        </div>
        <div className="border-t border-line px-[15px] py-2.5 font-mono text-[8.5px] leading-[1.7] text-text-dim">
          Garis putih menandai estimasi; bar melampauinya berarti jam tercatat melebihi estimasi.
          {data.import_estimated_hours > 0 && (
            <span className="mt-1 block">
              Jam tercatat termasuk {data.import_estimated_hours.toFixed(1)} jam ESTIMASI dari riwayat tanggal status hasil import (1 hari kerja = 8 jam per orang).
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
