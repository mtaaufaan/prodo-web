import { useEffect, useMemo, useState } from 'react'

import Grid1Pager from '@/components/shared/Grid1Pager'
import { TONE_BG, TONE_TEXT, memberRows } from '@/features/timesheet/analytics'
import type { TimesheetMemberRow } from '@/features/timesheet/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10
const AVATAR_BG = ['bg-signal', 'bg-mint', 'bg-violet', 'bg-blue', 'bg-amber']
const COLS = 'grid-cols-[minmax(120px,2fr)_minmax(56px,0.7fr)_minmax(58px,0.7fr)_minmax(74px,0.9fr)_minmax(100px,1.2fr)]'

// Tab Per-Member ("PM Timesheet.dc.html"): JAM = jam disetujui yang dicatat
// member itu sendiri; BEBAN AKTIF = task belum selesai yang dipegang sebagai
// PIC aktif (definisi Task Load Member Performance, IG-126).
export default function TimesheetMembersView({ members, hasEstimates = false }: { members: TimesheetMemberRow[]; hasEstimates?: boolean }) {
  const rows = useMemo(() => memberRows(members), [members])
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])
  const slice = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-line">
      <div className={cn('grid gap-x-2 bg-bg-deep px-3.5 py-[11px] font-mono text-[9px] tracking-[0.1em] text-text-dim', COLS)}>
        <span>MEMBER</span>
        <span>TASK</span>
        <span>JAM</span>
        <span>RATA/TASK</span>
        <span>BEBAN AKTIF</span>
      </div>
      <div className="flex-1 overflow-auto">
        {slice.map((m, i) => (
          <div key={m.userId} className={cn('grid items-center gap-x-2 border-t border-line px-3.5 py-3', COLS)}>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={cn('flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center text-[10px] font-extrabold text-bg-deep', AVATAR_BG[((page - 1) * PAGE_SIZE + i) % AVATAR_BG.length])}>
                {m.initials}
              </span>
              <div className="min-w-0 leading-[1.3]">
                <div className="truncate text-[12.5px] text-text-bone">{m.name}</div>
                <div className="mt-1 font-mono text-[8px] text-text-dim">{m.role}</div>
              </div>
            </div>
            <span className="font-mono text-[11px] text-text-body">{m.tasks}</span>
            <span className="font-mono text-[11px] text-text-body">
              {m.hours}
              {m.hoursNote && <span className="block text-[8px] text-text-dim">{m.hoursNote}</span>}
            </span>
            <span className="font-mono text-[10px] text-text-muted">{m.avg}</span>
            <div>
              <div className="h-[7px] bg-bg-deep">
                <div className={cn('h-full', TONE_BG[m.loadTone])} style={{ width: `${m.loadPct}%` }} />
              </div>
              <div className={cn('mt-1 font-mono text-[8px]', TONE_TEXT[m.loadTone])}>{m.loadLabel}</div>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-3.5 py-[30px] text-center font-mono text-[10.5px] leading-[1.8] text-text-dim">Belum ada jam tercatat maupun task aktif pada project ini.</div>
        )}
      </div>
      <div className="border-t border-line bg-bg-deep px-3.5 py-[11px] font-mono text-[9px] leading-[1.8] text-text-dim">
        Beban aktif dihitung dari task belum selesai yang sedang dipegang member sebagai PIC aktif. Angka ini bersifat indikatif untuk penyeimbangan beban, bukan penilaian kinerja individu.
        {hasEstimates && <span className="mt-1 block">Jam bertanda &quot;est.&quot; adalah estimasi dari riwayat tanggal status hasil import (1 hari kerja = 8 jam), bukan jam yang dicatat sendiri.</span>}
      </div>
      <Grid1Pager page={page} perPage={PAGE_SIZE} total={rows.length} onPage={setPage} />
    </div>
  )
}
