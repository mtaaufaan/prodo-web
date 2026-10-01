import { useEffect, useMemo, useRef, useState } from 'react'

import { useProjectDependencies, useProjectStatusSessions, useUpdateTask } from '@/features/tasks/hooks'
import { statusColorClasses, type Sprint, type Task, type TaskStatusSession } from '@/features/tasks/types'
import { cn } from '@/lib/utils'

import {
  addDaysUTC,
  computeActualBar,
  DAY_MS,
  dayFloorUTC,
  fmtShort,
  MONTHS_ID,
  parseDateOnly,
  sprintEndFor,
  WEEKDAY_ID,
  buildElbowPoints,
} from './ganttMath'

// GanttChart (menu Board tab Gantt, US-039/H22-24) -- port dari desain
// otoritatif "PM Board.dc.html" (Claude Design), dibaca langsung via
// DesignSync setelah user menjalankan /design-login. Lihat
// implementation_gaps.md IG-110/IG-111: laporan awal IG-110 menyebut desain
// punya 2 mode (PER TASK + TIMELINE SPRINT) berdasarkan keberadaan kode
// `ganttMode`/`ganttModes` di source desain -- KELIRU, ditemukan user lewat
// screenshot: kode itu masih ada tapi `ganttModes` (daftar tombol toggle)
// TIDAK PERNAH dirender di markup manapun (cuma didefinisikan sekali, tidak
// dipakai sc-for), jadi mode 'Sprint' adalah kode mati yang tidak bisa
// dijangkau user di desain sungguhan. Toggle mode + render TIMELINE SPRINT
// (sebelumnya ada di sini) dihapus menyusul koreksi ini -- cuma PER TASK
// (PLAN vs ACTUAL) yang dipertahankan, sesuai satu-satunya tampilan yang
// benar-benar bisa diakses di desain.
//
// Beda sengaja dari prototype (didokumentasikan, bukan kelalaian):
// - Panah dependency: satu <polyline> SVG per edge, bukan tumpukan div
//   absolut (akal-akalan templating prototype) -- hasil visual sama.
// - Progress % bar 'prog' (sedang berjalan): HANYA dari rasio jam tercatat/
//   estimasi, fallback rasio waktu-berlalu/rentang -- prototype juga py
//   tingkat rasio sub-task (subDone/subCount), TIDAK diikutkan karena data
//   itu baru tersedia per-task (bukan bulk per-project), butuh endpoint
//   baru lagi di luar cakupan sesi ini.

const DAY_W = 28
const ROW_H = 46
const TAIL_PX = 170

interface GanttChartProps {
  projectId: string
  tasks: Task[]
  sprints: Sprint[]
  onOpenTask: (taskId: string) => void
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}

function shiftDateStr(dateStr: string | null, days: number): string {
  const d = parseDateOnly(dateStr)
  if (!d) return dateStr ?? ''
  return addDaysUTC(d, days).toISOString().slice(0, 10)
}

export default function GanttChart({ projectId, tasks, sprints, onOpenTask }: GanttChartProps) {
  const sessionsQuery = useProjectStatusSessions(projectId)
  const dependenciesQuery = useProjectDependencies(projectId)
  const updateTask = useUpdateTask(projectId)

  const [sprintFilter, setSprintFilter] = useState('Semua')
  const [depsOn, setDepsOn] = useState(true)
  const [drag, setDrag] = useState<{ taskId: string; days: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrolledOnceRef = useRef(false)

  const sessionsByTask = useMemo(() => {
    const map = new Map<string, TaskStatusSession[]>()
    for (const s of sessionsQuery.data ?? []) {
      const arr = map.get(s.task_id)
      if (arr) arr.push(s)
      else map.set(s.task_id, [s])
    }
    return map
  }, [sessionsQuery.data])

  const today = dayFloorUTC(Date.now())
  const dated = useMemo(() => tasks.filter((t) => t.start_date && t.due_date), [tasks])

  const sprintNames = useMemo(() => {
    const names = new Set<string>()
    dated.forEach((t) => { if (t.sprint_name) names.add(t.sprint_name) })
    return Array.from(names)
  }, [dated])

  const taskRows = sprintFilter === 'Semua' ? dated : dated.filter((t) => t.sprint_name === sprintFilter)

  // ---- rentang tanggal project (lebar piksel/hari tetap) ----
  const { pStart, nDays } = useMemo(() => {
    const bounds: Date[] = [today]
    dated.forEach((t) => {
      const a = parseDateOnly(t.start_date)
      const b = parseDateOnly(t.due_date)
      if (a) bounds.push(a)
      if (b) bounds.push(b)
    })
    sprints.forEach((s) => {
      const a = parseDateOnly(s.start_date)
      const b = parseDateOnly(s.end_date)
      if (a) bounds.push(a)
      if (b) bounds.push(b)
    })
    const minMs = Math.min(...bounds.map((d) => d.getTime()))
    const maxMs = Math.max(...bounds.map((d) => d.getTime()))
    const start = dayFloorUTC(minMs)
    const tailDays = Math.ceil(TAIL_PX / DAY_W)
    const days = Math.max(1, diffDays(start, dayFloorUTC(maxMs)) + 1) + tailDays
    return { pStart: start, nDays: days }
  }, [dated, sprints, today])

  const pEnd = addDaysUTC(pStart, nDays)
  const xOf = (d: Date) => diffDays(pStart, d) * DAY_W
  const timelineW = nDays * DAY_W

  // Auto-scroll ke Hari Ini saat pertama render (sekali saja per project).
  useEffect(() => {
    scrolledOnceRef.current = false
  }, [projectId])
  useEffect(() => {
    if (scrolledOnceRef.current || !scrollRef.current) return
    scrolledOnceRef.current = true
    scrollRef.current.scrollLeft = Math.max(0, xOf(today) - 260)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cuma sekali, dependensi xOf/today stabil per render
  }, [pStart, nDays])

  // ---- hari (grid harian) + bulan (header atas) ----
  const days = useMemo(() => {
    const out: { num: string; wd: string; isToday: boolean; isWeekend: boolean }[] = []
    for (let i = 0; i < nDays; i++) {
      const d = addDaysUTC(pStart, i)
      const wd = d.getUTCDay()
      out.push({
        num: String(d.getUTCDate()),
        wd: WEEKDAY_ID[wd],
        isToday: diffDays(d, today) === 0,
        isWeekend: wd === 0 || wd === 6,
      })
    }
    return out
  }, [pStart, nDays, today])

  const months = useMemo(() => {
    const out: { label: string; w: number }[] = []
    let cursor = new Date(pStart.getTime())
    while (cursor < pEnd) {
      const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
      const segEnd = next < pEnd ? next : pEnd
      const w = diffDays(cursor, segEnd) * DAY_W
      out.push({ label: MONTHS_ID[cursor.getUTCMonth()] + ' ' + cursor.getUTCFullYear(), w })
      cursor = segEnd
    }
    return out
  }, [pStart, pEnd])

  const milestones = useMemo(
    () =>
      sprints
        .map((s) => {
          const end = parseDateOnly(s.end_date)
          if (!end) return null
          const x = xOf(end) + DAY_W
          return { x, label: s.name.toUpperCase() }
        })
        .filter((m): m is { x: number; label: string } => m != null && m.x >= 0 && m.x <= timelineW + 1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sprints, pStart, timelineW],
  )

  // ---- baris PLAN vs ACTUAL ----
  const geo = new Map<string, { left: number; width: number }>()
  const rows = taskRows.map((t) => {
    const start = parseDateOnly(t.start_date)!
    const due = parseDateOnly(t.due_date)!
    const shift = drag?.taskId === t.id ? drag.days : 0
    const planLeft = xOf(start) + shift * DAY_W
    const planWidth = Math.max(DAY_W * 0.6, xOf(due) + DAY_W - xOf(start))
    geo.set(t.id, { left: planLeft, width: planWidth })

    const sessions = sessionsByTask.get(t.id) ?? []
    const sprintEnd = t.sprint_name ? sprintEndFor(t.sprint_name, sprints) : null
    const actual = computeActualBar(t, sessions, sprintEnd, today)
    const delayDays = actual.kind === 'done' ? Math.max(0, diffDays(due, actual.aEnd)) : 0

    let actLeft: number, actWidth: number, actColorCls: string, actLabel: string
    if (actual.kind === 'todo') {
      actLeft = planLeft
      actWidth = planWidth
      actColorCls = 'border-text-dim border-dashed bg-transparent'
      actLabel = 'BELUM MULAI'
    } else {
      const aS = actual.aStart ?? start
      actLeft = xOf(aS) + shift * DAY_W
      actWidth = Math.max(DAY_W * 0.6, xOf(actual.aEnd) + DAY_W - xOf(aS))
      if (actual.kind === 'done') {
        actColorCls = delayDays ? 'bg-destructive/25 border-destructive' : 'bg-mint/25 border-mint'
        actLabel = delayDays ? `+${delayDays} HARI DELAY` : 'TEPAT WAKTU'
      } else if (actual.kind === 'blocked') {
        actColorCls = 'bg-amber/25 border-amber'
        actLabel = 'BLOCKED'
      } else {
        const estH = t.estimated_hours
        const loggedH = t.logged_minutes / 60
        const span = Math.max(DAY_MS, actual.aEnd.getTime() + DAY_MS - aS.getTime())
        const ratio = estH && estH > 0 ? loggedH / estH : (Date.now() - aS.getTime()) / span
        const pct = Math.round(Math.max(0.05, Math.min(0.95, ratio)) * 100)
        actColorCls = 'bg-blue/25 border-blue'
        actLabel = `${pct}% BERJALAN`
      }
    }

    return {
      task: t,
      planLeft,
      planWidth,
      actLeft,
      actWidth,
      actColorCls,
      actLabel,
      status: statusColorClasses(t.status_color),
      isLate: Boolean(t.due_date && t.due_date < today.toISOString().slice(0, 10) && t.status_name !== 'DONE'),
      lockTag: t.is_blocked ? '⛔' : '',
    }
  })

  const rowIndex = new Map(taskRows.map((t, i) => [t.id, i]))
  const edges = useMemo(
    () => (dependenciesQuery.data ?? []).filter((e) => rowIndex.has(e.predecessor_id) && rowIndex.has(e.successor_id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rowIndex diturunkan dari taskRows tiap render, taskRows cukup sbg dep
    [dependenciesQuery.data, taskRows],
  )
  const depHeld = edges.filter((e) => e.predecessor_status !== 'DONE').length

  const handleBarMouseDown = (task: Task) => (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const x0 = e.clientX
    const move = (ev: MouseEvent) => setDrag({ taskId: task.id, days: Math.round((ev.clientX - x0) / DAY_W) })
    const up = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
      const days = Math.round((ev.clientX - x0) / DAY_W)
      setDrag(null)
      if (days === 0) return
      updateTask.mutate({
        taskId: task.id,
        values: {
          title: task.title,
          description: typeof task.description === 'string' ? task.description : undefined,
          priority: task.priority,
          start_date: shiftDateStr(task.start_date, days),
          due_date: shiftDateStr(task.due_date, days),
          estimated_hours: task.estimated_hours,
          story_points: task.story_points,
          sprint_id: task.sprint_id,
          assignee_ids: task.assignees.map((a) => a.user_id),
        },
      })
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const isLoading = sessionsQuery.isLoading || dependenciesQuery.isLoading

  return (
    <div className="flex min-h-0 flex-1 flex-col border border-line">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-raised-1 px-3.5 py-2.5">
        <div className="flex flex-wrap gap-1.5">
          {['Semua', ...sprintNames].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSprintFilter(n)}
              className={cn(
                'border px-2 py-1 font-mono text-[8.5px]',
                sprintFilter === n ? 'border-signal bg-signal/10 text-signal' : 'border-line-strong text-text-muted',
              )}
            >
              {n === 'Semua' ? 'SEMUA SPRINT' : n.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDepsOn((v) => !v)}
          className={cn(
            'border px-2 py-1 font-mono text-[8.5px]',
            depsOn ? 'border-destructive bg-destructive/10 text-destructive' : 'border-line-strong text-text-muted',
          )}
        >
          GARIS DEPENDENCY · {depsOn ? 'AKTIF' : 'NONAKTIF'}
        </button>
        <span className="font-mono text-[8px] text-text-dim">
          {edges.length ? `${edges.length} GARIS · ${depHeld} MASIH MENAHAN` : 'TIDAK ADA DEPENDENCY'}
        </span>
      </div>

      {isLoading && <p className="p-4 text-sm text-text-muted">Memuat data Gantt...</p>}

      {!isLoading && (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
          {rows.length === 0 ? (
            <p className="p-7 font-mono text-[10px] text-text-dim">Tidak ada task bertanggal (isi Start Date dan Due Date pada task untuk tampil di Gantt).</p>
          ) : (
            <div style={{ position: 'relative', width: 396 + timelineW }}>
              <div className="sticky top-0 z-[8] flex border-b border-line-strong bg-raised-1">
                <div
                  className="sticky left-0 z-[9] grid flex-shrink-0 bg-raised-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-muted"
                  style={{ width: 396, gridTemplateColumns: '208px 94px 94px', gridTemplateRows: '20px 18px 18px' }}
                >
                  <span className="flex items-center px-3.5 text-text-bone" style={{ gridRow: '1 / 4' }}>TASK</span>
                  <span className="flex items-center border-l border-line px-2.5">TGL MULAI</span>
                  <span className="flex items-center border-l border-line px-2.5">TGL AKHIR</span>
                  <span className="flex items-center gap-1.5 border-l border-t border-line px-2.5"><span className="h-1 w-2.5 bg-text-dim" />PLAN</span>
                  <span className="flex items-center gap-1.5 border-l border-t border-line px-2.5"><span className="h-1 w-2.5 bg-blue" />AKTUAL</span>
                </div>
                <div style={{ width: timelineW }} className="flex flex-shrink-0 flex-col">
                  <div className="flex h-5">
                    {months.map((m, i) => (
                      <span key={i} className="flex-shrink-0 overflow-hidden whitespace-nowrap border-l border-line-strong pl-1.5 font-mono text-[8.5px] tracking-[0.1em] text-text-muted" style={{ width: m.w }}>
                        {m.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex h-[18px] border-t border-line">
                    {days.map((d, i) => (
                      <span
                        key={i}
                        className={cn('flex-shrink-0 overflow-hidden border-l border-line text-center font-mono text-[8px] leading-[17px]', d.isToday ? 'bg-destructive/15 text-destructive' : d.isWeekend ? 'bg-panel text-text-dim' : 'text-text-muted')}
                        style={{ width: DAY_W }}
                      >
                        {d.num}
                      </span>
                    ))}
                  </div>
                  <div className="flex h-[18px] border-t border-line">
                    {days.map((d, i) => (
                      <span key={i} className={cn('flex-shrink-0 overflow-hidden text-center font-mono text-[7.5px] leading-[17px]', d.isToday ? 'text-destructive' : d.isWeekend ? 'text-text-dim' : 'text-text-muted')} style={{ width: DAY_W }}>
                        {d.wd}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                {/* Milestone marker baris (akhir sprint) */}
                <div className="sticky top-[57px] z-[7] flex h-[30px] border-b border-line bg-panel">
                  <div className="sticky left-0 z-[5] flex flex-shrink-0 items-center gap-1.5 border-r border-line-strong bg-panel px-3.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-muted" style={{ width: 396 }}>
                    <span className="block h-2 w-2 rotate-45 bg-amber" />MILESTONE
                  </div>
                  <div className="relative flex-shrink-0" style={{ width: timelineW, zIndex: 1 }}>
                    {milestones.map((m, i) => (
                      <div key={i} title={m.label} className="absolute top-[3px] flex items-center gap-1.5" style={{ left: m.x, transform: 'translateX(-5px)' }}>
                        <span className="block h-2.5 w-2.5 flex-shrink-0 rotate-45 bg-amber" />
                        <span className="whitespace-nowrap bg-panel px-1 font-mono text-[8px] tracking-[0.06em] text-amber">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {rows.map((r) => (
                  <div key={r.task.id} className="flex border-b border-line" style={{ height: ROW_H }}>
                    <div
                      onClick={() => onOpenTask(r.task.id)}
                      className="sticky left-0 z-[5] grid flex-shrink-0 cursor-pointer border-r border-line-strong bg-raised-1 hover:bg-panel"
                      style={{ width: 396, gridTemplateColumns: '208px 94px 94px' }}
                    >
                      <div className="min-w-0 px-3.5 py-1.5 leading-[1.3]">
                        <div className="truncate text-[11.5px] text-text-bone">{r.task.title}</div>
                        <div className="mt-1 flex items-center gap-1 truncate font-mono text-[8px] text-text-dim">
                          {r.task.task_code} · <span className={r.status.text}>{r.task.status_name}</span>
                          {r.lockTag && <span className="text-destructive">{r.lockTag}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col justify-center gap-0.5 border-l border-line px-2.5 font-mono text-[9px] leading-tight">
                        <span className="text-text-muted">{fmtShort(parseDateOnly(r.task.start_date)!)}</span>
                      </div>
                      <div className="flex flex-col justify-center gap-0.5 border-l border-line px-2.5 font-mono text-[9px] leading-tight">
                        <span className={cn(r.isLate ? 'text-destructive' : 'text-text-muted')}>{fmtShort(parseDateOnly(r.task.due_date)!)}</span>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0" style={{ width: timelineW, backgroundImage: `repeating-linear-gradient(90deg, var(--color-line, #333) 0 1px, transparent 1px ${DAY_W}px)` }}>
                      <div
                        title={`PLAN · ${r.task.task_code} · ${fmtShort(parseDateOnly(r.task.start_date)!)} → ${fmtShort(parseDateOnly(r.task.due_date)!)} · tarik untuk menggeser jadwal`}
                        onMouseDown={handleBarMouseDown(r.task)}
                        className="absolute top-[9px] h-[11px] cursor-grab border bg-text-dim/30 border-text-dim active:cursor-grabbing"
                        style={{ left: r.planLeft, width: r.planWidth }}
                      />
                      <div
                        title={`AKTUAL · ${r.actLabel}`}
                        className={cn('absolute top-[25px] h-[11px] overflow-hidden border', r.actColorCls)}
                        style={{ left: r.actLeft, width: r.actWidth }}
                      />
                      <span className="absolute top-[23px] whitespace-nowrap font-mono text-[7.5px] tracking-[0.04em] text-text-dim" style={{ left: r.actLeft + r.actWidth + 6 }}>
                        {r.actLabel}
                      </span>
                    </div>
                  </div>
                ))}
                {depsOn && edges.length > 0 && (
                  <svg
                    className="pointer-events-none absolute left-[396px] top-[31px]"
                    width={timelineW}
                    height={rows.length * ROW_H}
                    style={{ overflow: 'visible' }}
                  >
                    <defs>
                      <marker id="gantt-arrow-open" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                        <path d="M0,0 L6,3 L0,6 Z" className="fill-destructive" />
                      </marker>
                      <marker id="gantt-arrow-closed" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                        <path d="M0,0 L6,3 L0,6 Z" className="fill-text-dim" />
                      </marker>
                    </defs>
                    {edges.map((e, i) => {
                      const from = geo.get(e.predecessor_id)
                      const to = geo.get(e.successor_id)
                      const j = rowIndex.get(e.predecessor_id)
                      const k = rowIndex.get(e.successor_id)
                      if (!from || !to || j === undefined || k === undefined) return null
                      const x1 = from.left + from.width
                      const x2 = to.left
                      const y1 = j * ROW_H + ROW_H / 2
                      const y2 = k * ROW_H + ROW_H / 2
                      const open = e.predecessor_status !== 'DONE'
                      const points = buildElbowPoints(x1, y1, x2, y2)
                      return (
                        <polyline
                          key={i}
                          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          strokeWidth={1.5}
                          className={open ? 'stroke-destructive' : 'stroke-text-dim'}
                          markerEnd={open ? 'url(#gantt-arrow-open)' : 'url(#gantt-arrow-closed)'}
                        />
                      )
                    })}
                  </svg>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-line bg-raised-1 px-3.5 py-2.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-text-muted">
        <span className="text-text-dim tracking-[0.14em]">LEGENDA</span>
        <span className="flex items-center gap-1.5"><span className="block h-2.5 w-4 border border-text-dim bg-text-dim/30" />PLAN</span>
        <span className="flex items-center gap-1.5"><span className="block h-2.5 w-4 border border-mint bg-mint/25" />TEPAT WAKTU</span>
        <span className="flex items-center gap-1.5"><span className="block h-2.5 w-4 border border-destructive bg-destructive/25" />DELAY</span>
        <span className="flex items-center gap-1.5"><span className="block h-2.5 w-4 border border-blue bg-blue/25" />IN PROGRESS</span>
        <span className="flex items-center gap-1.5"><span className="block h-2.5 w-4 border border-amber bg-amber/25" />BLOCKED</span>
        <span className="flex items-center gap-1.5"><span className="block h-2.5 w-4 border border-dashed border-text-dim" />BELUM MULAI</span>
        <span className="flex items-center gap-1.5"><span className="block h-2.5 w-2.5 rotate-45 bg-amber" />MILESTONE</span>
        <span className="flex items-center gap-1.5"><span className="block h-3 w-0 border-l border-dashed border-destructive" />HARI INI</span>
      </div>
      <div className="border-t border-line bg-panel px-3.5 py-2.5 font-mono text-[8.5px] leading-relaxed text-text-muted">
        Batang PLAN (atas) = Start Date → Due Date. Batang AKTUAL (bawah) dihitung dari Waktu Status sungguhan -- mulai saat masuk IN PROGRESS, berakhir saat DONE/BLOCKED. Tarik batang PLAN untuk menggeser jadwal; perubahan tersimpan dan tercatat di Audit Trail.
      </div>
    </div>
  )
}
