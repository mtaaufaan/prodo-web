import type { ProjectTimesheet, TimesheetMemberRow, TimesheetStatusBar, TimesheetTaskRow, Tone } from './types'

// Perhitungan tampilan "PM Timesheet.dc.html" (fungsi murni, diuji unit).

export const fmtHours = (h: number): string => h.toFixed(1)

export interface StatCard {
  label: string
  value: string
  note: string
  tone: Tone
}

export function statCards(d: ProjectTimesheet): StatCard[] {
  return [
    {
      label: 'JAM TERCATAT',
      value: fmtHours(d.logged_hours),
      note: `PROJECT ${d.project_name.toUpperCase()}${d.import_estimated_hours > 0 ? ` · ${fmtHours(d.import_estimated_hours)} JAM ESTIMASI` : ''}`,
      tone: 'bone',
    },
    {
      label: 'TOTAL ESTIMASI',
      value: fmtHours(d.estimate_hours),
      note: d.estimate_hours > 0 ? `${Math.round((d.logged_hours / d.estimate_hours) * 100)}% TERSERAP` : 'BELUM ADA',
      tone: 'blue',
    },
    {
      label: 'MELEBIHI ESTIMASI',
      value: String(d.over_count),
      note: d.over_count > 0 ? d.over_codes.join(', ') : 'TIDAK ADA',
      tone: d.over_count > 0 ? 'destructive' : 'mint',
    },
    { label: 'MEMBER TERLIBAT', value: String(d.members_involved), note: 'PUNYA JAM ATAU TASK AKTIF DI PROJECT INI', tone: 'violet' },
  ]
}

export interface StatusBarView {
  name: string
  colorToken: string | null // null = status "belum didefinisikan" -> redup
  hours: string
  tasks: string
  widthPct: number
}

// statusBarRows -- lebar batang relatif terhadap status dengan jam terbanyak
// (minimal pembagi 1 supaya semua-nol tidak NaN).
export function statusBarRows(bars: TimesheetStatusBar[]): StatusBarView[] {
  const max = Math.max(1, ...bars.map((b) => b.hours))
  return bars.map((b) => ({
    name: b.name,
    colorToken: b.is_undefined ? null : b.color_token,
    hours: `${fmtHours(b.hours)} JAM`,
    tasks: `${b.task_count} TASK`,
    widthPct: Math.round((b.hours / max) * 100),
  }))
}

export interface AccuracyView {
  code: string
  title: string
  delta: string
  tone: Tone
  widthPct: number
  markPct: number
  meta: string
}

// Penanda estimasi ada di 70% lebar; bar melampaui = melebihi estimasi.
export const ESTIMATE_MARK_PCT = 70

export function accuracyRow(t: TimesheetTaskRow): AccuracyView {
  const ratio = t.estimated_hours > 0 ? t.logged_hours / t.estimated_hours : 0
  const tone: Tone = ratio > 1 ? 'destructive' : ratio >= 0.85 ? 'amber' : 'mint'
  const delta =
    ratio > 1
      ? `+${Math.round((ratio - 1) * 100)}% DARI ESTIMASI`
      : t.logged_hours === 0
        ? 'BELUM ADA JAM'
        : `${Math.round(ratio * 100)}% TERPAKAI`
  return {
    code: t.task_code,
    title: t.title,
    delta,
    tone,
    widthPct: Math.min(100, Math.round(ratio * ESTIMATE_MARK_PCT)),
    markPct: ESTIMATE_MARK_PCT,
    meta: `${fmtHours(t.logged_hours)} JAM TERCATAT DARI ${fmtHours(t.estimated_hours)} JAM ESTIMASI · ${t.status_name}`,
  }
}

export interface MemberView {
  userId: string
  name: string
  role: string
  initials: string
  tasks: string
  hours: string
  hoursNote: string // mis. "2.0 est." bila sebagian jam berasal dari estimasi import
  avg: string
  loadPct: number
  loadTone: Tone
  loadLabel: string
}

const ROLE_LABELS: Record<string, string> = {
  admin_workspace: 'Admin Workspace',
  project_manager: 'Project Manager',
  editor: 'Editor',
  approver: 'Approver',
  viewer: 'Viewer',
  division_viewer: 'Division Viewer',
}

export const roleLabel = (role: string): string => ROLE_LABELS[role] ?? '—'

export function initialsOf(name: string): string {
  return (
    name
      .split(/[\s.@]+/)
      .map((w) => w[0] || '')
      .join('')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

// memberRows -- BEBAN AKTIF relatif terhadap member dengan task aktif
// terbanyak (indikatif untuk penyeimbangan beban, bukan penilaian kinerja).
export function memberRows(members: TimesheetMemberRow[]): MemberView[] {
  const maxActive = Math.max(1, ...members.map((m) => m.active_count))
  return members.map((m) => {
    const loadPct = Math.round((m.active_count / maxActive) * 100)
    return {
      userId: m.user_id,
      name: m.user_name,
      role: roleLabel(m.role),
      initials: initialsOf(m.user_name),
      tasks: String(m.task_count),
      hours: fmtHours(m.hours),
      hoursNote: m.estimate_hours > 0 ? `${fmtHours(m.estimate_hours)} est.` : '',
      avg: m.task_count > 0 ? `${fmtHours(m.hours / m.task_count)} JAM` : '—',
      loadPct,
      loadTone: loadPct >= 80 ? 'destructive' : loadPct >= 50 ? 'amber' : 'mint',
      loadLabel: `${m.active_count} TASK BERJALAN${loadPct >= 80 && m.active_count > 0 ? ' · BEBAN TERTINGGI' : ''}`,
    }
  })
}

export const TONE_TEXT: Record<Tone, string> = {
  mint: 'text-mint',
  amber: 'text-amber',
  destructive: 'text-destructive',
  blue: 'text-blue',
  violet: 'text-violet',
  bone: 'text-text-bone',
  dim: 'text-text-dim',
}

export const TONE_BG: Record<Tone, string> = {
  mint: 'bg-mint',
  amber: 'bg-amber',
  destructive: 'bg-destructive',
  blue: 'bg-blue',
  violet: 'bg-violet',
  bone: 'bg-text-bone',
  dim: 'bg-text-dim',
}

// Entri manual: validasi sisi klien sebelum dikirim (backend memvalidasi ulang).
export function validateManualEntry(taskId: string, start: string, end: string, now = new Date()): string | null {
  if (!taskId) return 'Pilih task terlebih dahulu.'
  if (!start || !end) return 'Tanggal/jam mulai dan selesai wajib diisi.'
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 'Tanggal/jam tidak valid.'
  if (e <= s) return 'Waktu selesai harus setelah waktu mulai.'
  if (s > now) return 'Waktu mulai tidak boleh di masa depan.'
  if (e.getTime() - s.getTime() > 24 * 60 * 60 * 1000) return 'Satu entri maksimal 24 jam.'
  return null
}

export const ENTRY_ERROR_MESSAGES: Record<string, string> = {
  TIME_ENTRY_OVERLAP: 'Rentang waktu ini overlap dengan entri yang sudah ada.',
  TIME_ENTRY_ALREADY_APPROVED: 'Entri yang sudah disetujui tidak dapat diubah.',
  TIME_ENTRY_NOT_PENDING: 'Entri ini sudah diputuskan sebelumnya.',
  FORBIDDEN: 'Anda tidak berwenang atas entri ini.',
}

export function entryErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { code?: string } | null)?.code
  return (code && ENTRY_ERROR_MESSAGES[code]) || fallback
}

// ISO -> nilai <input type="datetime-local"> (waktu lokal, tanpa detik).
export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fmtMinutes(min: number | null): string {
  if (min == null) return '—'
  if (min < 60) return `${min} mnt`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} jam` : `${h} jam ${m} mnt`
}

export function fmtEntryRange(startedAt: string, endedAt: string | null): string {
  const s = new Date(startedAt)
  const date = s.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return endedAt ? `${date} · ${time(s)}–${time(new Date(endedAt))}` : `${date} · ${time(s)}`
}

export const APPROVAL_BADGE: Record<'pending' | 'approved' | 'rejected', { label: string; cls: string }> = {
  pending: { label: 'MENUNGGU', cls: 'border-amber text-amber' },
  approved: { label: 'DISETUJUI', cls: 'border-mint text-mint' },
  rejected: { label: 'DITOLAK', cls: 'border-destructive text-destructive' },
}
