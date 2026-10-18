import { MAX_LOG_HOURS, type TimesheetEntry, type TimesheetTask } from './types'

// Fungsi murni Timesheet Editor (S6E-09).

// sanitizeHours -- input JAM hanya angka dan titik (desain: replace(/[^0-9.]/g, '')).
export function sanitizeHours(v: string): string {
  return v.replace(/[^0-9.]/g, '')
}

// parseHours -- NaN ("2.5.3") dan kosong menjadi 0.
export function parseHours(v: string): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// validateLog -- aturan modal Catat Waktu (pesan persis desain); '' = valid.
export function validateLog(taskId: string, hoursText: string): string {
  if (!taskId) return 'Pilih task yang dikerjakan terlebih dahulu.'
  if (hoursText.trim() !== '' && Number.isNaN(Number(hoursText))) return 'Format jam tidak valid -- contoh: 2.5.'
  const h = parseHours(hoursText)
  if (h <= 0) return 'Jumlah jam harus lebih dari 0.'
  if (h > MAX_LOG_HOURS) return 'Maksimal 12 jam per pencatatan — pecah menjadi beberapa entri bila perlu.'
  return ''
}

const DAY_MS = 86_400_000

// weekStartISO -- Senin (UTC) minggu dari tanggal YYYY-MM-DD.
export function weekStartISO(dateISO: string): string {
  const t = Date.parse(`${dateISO}T00:00:00Z`)
  const dow = (new Date(t).getUTCDay() + 6) % 7 // Senin = 0
  return new Date(t - dow * DAY_MS).toISOString().slice(0, 10)
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES']
const dm = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`

// weekLabel -- "MINGGU 12 OKT – 18 OKT 2026" dari Senin minggu itu.
export function weekLabel(weekStart: string): string {
  const end = new Date(Date.parse(`${weekStart}T00:00:00Z`) + 6 * DAY_MS).toISOString().slice(0, 10)
  return `MINGGU ${dm(weekStart)} – ${dm(end)} ${end.slice(0, 4)}`
}

export interface WeekGroup {
  weekStart: string
  label: string
  totalHours: number
  entries: TimesheetEntry[]
}

// groupByWeek -- kelompok per minggu (terbaru dulu), urutan entri dalam kelompok mengikuti masukan.
export function groupByWeek(entries: TimesheetEntry[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>()
  for (const e of entries) {
    const ws = weekStartISO(e.entry_date)
    const g = map.get(ws) ?? { weekStart: ws, label: weekLabel(ws), totalHours: 0, entries: [] }
    g.entries.push(e)
    g.totalHours += e.hours
    map.set(ws, g)
  }
  return [...map.values()].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
}

export interface HourBar {
  task: TimesheetTask
  width: string
  over: boolean
}

// weekBars -- bar "JAM SAYA MINGGU INI": task dengan jam minggu ini, terbanyak dulu; lebar relatif
// terhadap yang terbanyak; merah bila TOTAL jam task melebihi estimasi.
export function weekBars(tasks: TimesheetTask[]): HourBar[] {
  const rows = tasks.filter((t) => t.week_hours > 0).sort((a, b) => b.week_hours - a.week_hours)
  const max = Math.max(1, ...rows.map((t) => t.week_hours))
  return rows.map((t) => ({
    task: t,
    width: `${Math.round((t.week_hours / max) * 100)}%`,
    over: Boolean(t.estimate_hours && t.logged_hours > t.estimate_hours),
  }))
}
