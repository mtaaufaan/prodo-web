import type { Sprint, Task, TaskStatusSession } from '@/features/tasks/types'

// ganttMath -- fungsi murni (tanggal/geometri) untuk GanttChart.tsx, dipisah
// supaya bisa diuji unit tanpa render komponen. Port dari prototype
// "PM Board.dc.html" (Claude Design, project ID 90027a31-819b-4d24-8a13-
// a09c45731292) -- logic bar PLAN/ACTUAL dan routing panah dependency
// disalin SEPERSIS mungkin dari situ, cuma representasi panah diganti dari
// tumpukan div absolut (akal-akalan templating prototype) jadi satu
// <polyline> SVG -- hasil visual sama (garis siku + arrowhead), lebih
// sedikit elemen.

export const DAY_MS = 86400000
export const MONTHS_ID = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES']
export const WEEKDAY_ID = ['MG', 'SN', 'SL', 'RB', 'KM', 'JM', 'SB']

// parseDateOnly/dayFloorUTC -- UTC murni, sama alasan autoFillTaskDates
// (features/tasks/types.ts): "YYYY-MM-DD" ditafsirkan di local time lalu
// bisa mundur/maju satu hari saat timezone browser bukan UTC.
export function parseDateOnly(s: string | null | undefined): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(Date.UTC(y, m - 1, d))
  return Number.isNaN(date.getTime()) ? null : date
}

export function dayFloorUTC(ms: number): Date {
  const d = new Date(ms)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export function addDaysUTC(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS)
}

export function fmtShort(d: Date): string {
  return String(d.getUTCDate()).padStart(2, '0') + ' ' + MONTHS_ID[d.getUTCMonth()]
}

// isUntrackedStatusTime -- IDENTIK TaskDetailModal.tsx (tab WAKTU STATUS,
// IG-97): BACKLOG/DONE auto-fill work_started_at (S4-67 backend), bukan
// pengerjaan aktual sungguhan. Duplikasi kecil disengaja (pola sama
// komentar TaskDetailModal -- murni tampilan per-komponen, bukan util
// bersama) supaya kedua tempat tidak diam-diam saling mempengaruhi.
export function isUntrackedStatusTime(statusName: string): boolean {
  return statusName === 'BACKLOG' || statusName === 'DONE'
}

export type ActualBarKind = 'todo' | 'prog' | 'done' | 'blocked'

export interface ActualBar {
  kind: ActualBarKind
  /** Awal pengerjaan aktual (null kalau task belum pernah keluar BACKLOG). */
  aStart: Date | null
  /** Akhir rentang bar ACTUAL (selalu terisi -- fallback ke due_date). */
  aEnd: Date
}

// computeActualBar -- port `pvActual`+penentuan `kind` di prototype.
// sessions HARUS sudah terurut entered_at ASC (query backend sudah begitu).
export function computeActualBar(
  task: Pick<Task, 'status_name' | 'due_date'>,
  sessions: TaskStatusSession[],
  sprintEnd: Date | null,
  today: Date,
): ActualBar {
  const due = parseDateOnly(task.due_date) ?? today
  const inProgress = sessions.find((s) => s.status_name === 'IN PROGRESS')
  let aStartMs: number | null = null
  if (inProgress) {
    aStartMs = new Date(inProgress.work_started_at ?? inProgress.entered_at).getTime()
  } else if (task.status_name !== 'BACKLOG') {
    const firstTracked = sessions.find((s) => !isUntrackedStatusTime(s.status_name))
    aStartMs = firstTracked ? new Date(firstTracked.entered_at).getTime() : null
  }

  let kind: ActualBarKind = 'todo'
  if (task.status_name === 'DONE') kind = 'done'
  else if (task.status_name === 'BLOCKED') kind = 'blocked'
  else if (task.status_name !== 'BACKLOG' && aStartMs != null) kind = 'prog'

  const aStart = aStartMs != null ? dayFloorUTC(aStartMs) : null
  let aEnd: Date
  if (kind === 'done') {
    const doneSession = sessions.find((s) => s.status_name === 'DONE')
    aEnd = dayFloorUTC(doneSession ? new Date(doneSession.entered_at).getTime() : today.getTime())
  } else if (kind === 'prog') {
    aEnd = new Date(Math.max(due.getTime(), today.getTime()))
  } else if (kind === 'blocked') {
    const blockedSession = [...sessions].reverse().find((s) => s.status_name === 'BLOCKED')
    const blockedMs = blockedSession ? dayFloorUTC(new Date(blockedSession.entered_at).getTime()).getTime() : 0
    aEnd = new Date(Math.max((sprintEnd ?? due).getTime(), blockedMs))
  } else {
    aEnd = due
  }
  return { kind, aStart, aEnd }
}

// ElbowPoint -- satu titik polyline SVG panah dependency.
export interface ElbowPoint {
  x: number
  y: number
}

// buildElbowPoints -- rute siku dari ujung bar predecessor (x1,y1) ke awal
// bar successor (x2,y2), port routing 2-cabang prototype (maju lurus vs.
// rute S kalau successor terlalu dekat/di belakang predecessor secara
// horizontal). gap = jarak keluar dari bar sebelum berbelok vertikal.
export function buildElbowPoints(x1: number, y1: number, x2: number, y2: number, gap = 9): ElbowPoint[] {
  if (x2 >= x1 + gap * 2) {
    const xb = x1 + gap
    return [
      { x: x1, y: y1 },
      { x: xb, y: y1 },
      { x: xb, y: y2 },
      { x: x2, y: y2 },
    ]
  }
  const xb = x1 + gap
  const xc = Math.max(x1 + 2, x2 - gap)
  const down = y2 > y1
  const ym = down ? y2 - 12 : y2 + 12
  return [
    { x: x1, y: y1 },
    { x: xb, y: y1 },
    { x: xb, y: ym },
    { x: xc, y: ym },
    { x: xc, y: y2 },
    { x: x2, y: y2 },
  ]
}

// progressPct -- persen bar AKTUAL "sedang berjalan" (5..95): jam tercatat /
// estimasi kalau KEDUANYA tersedia, selain itu rasio waktu berlalu / rentang
// bar. loggedMinutes hanya dikirim endpoint DETAIL task, TIDAK di daftar task
// yang dipakai Gantt -- undefined (bukan 0) harus jatuh ke rasio waktu, bukan
// NaN.
export function progressPct(
  estimatedHours: number | null | undefined,
  loggedMinutes: number | null | undefined,
  startMs: number,
  endMs: number,
  nowMs: number,
): number {
  const span = Math.max(DAY_MS, endMs + DAY_MS - startMs)
  const ratio =
    estimatedHours && estimatedHours > 0 && loggedMinutes != null ? loggedMinutes / 60 / estimatedHours : (nowMs - startMs) / span
  return Math.round(Math.max(0.05, Math.min(0.95, ratio)) * 100)
}

// milestoneLabel -- label ringkas penanda akhir sprint di baris MILESTONE
// (desain: nama dipotong di pemisah " · " / " - ", awalan "SPRINT" -> "M"):
// "Sprint 0 - Fondation" -> "M 0".
export function milestoneLabel(sprintName: string): string {
  return sprintName.replace(/\s+[-·–—]\s+.*$/, '').toUpperCase().replace(/^SPRINT\s*/, 'M ')
}

// sprintEndFor -- tanggal akhir sprint tempat task ini berada, dipakai
// computeActualBar kind='blocked' (bar BLOCKED berhenti di akhir sprint,
// bukan molor tanpa batas).
export function sprintEndFor(sprintName: string, sprints: Sprint[]): Date | null {
  const sp = sprints.find((s) => s.name === sprintName)
  return sp ? parseDateOnly(sp.end_date) : null
}
