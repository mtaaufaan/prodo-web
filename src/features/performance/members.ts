import { formatHours, type MemberStat } from './types'

// Member Performance berbasis PIC (IG-126). Completion hanya bermakna kalau
// member pernah memegang fase kerja (total_count > 0); PIC backlog murni
// (mis. PM) dinilai lewat Kesiapan Task.
export function hasWorkPhases(m: MemberStat): boolean {
  return m.total_count > 0
}

// readinessCell -- isi kolom KESIAPAN TASK (PIC backlog: task terbentuk ->
// dinyatakan lengkap). null = member tidak pernah jadi PIC backlog yang dinilai.
export function readinessCell(m: MemberStat): { value: string; note: string } | null {
  if (m.readiness_count === 0 && m.readiness_preparing === 0) return null
  const note: string[] = []
  if (m.readiness_count > 0) note.push(`${m.readiness_count} task siap`)
  if (m.readiness_preparing > 0) note.push(`${m.readiness_preparing} sedang disiapkan`)
  if (m.readiness_reopens > 0) note.push(`${m.readiness_reopens}× dibuka lagi`)
  return { value: m.readiness_avg_hours != null ? formatHours(m.readiness_avg_hours) : '—', note: note.join(' · ') }
}
