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

// ackCell -- isi kolom ACK RATE (Acknowledge Rate). value = rata-rata jeda bila ada
// yang di-acknowledge, selain itu "N pending" (fase AKTIF belum di-acknowledge),
// selain itu "—". note = "N tidak dikonfirmasi" (fase lama yang diserahkan tanpa
// acknowledge -- tidak lagi bisa di-acknowledge, jadi BUKAN pending) dan sisa pending.
export function ackCell(m: MemberStat): { value: string; tone: 'mint' | 'amber' | 'destructive' | 'dim'; note: string } {
  const ack = m.ack_avg_hours
  const note: string[] = []
  if (ack != null && m.ack_pending_count > 0) note.push(`${m.ack_pending_count} pending`)
  if (m.ack_unconfirmed_count > 0) note.push(`${m.ack_unconfirmed_count} tidak dikonfirmasi`)
  if (ack != null) return { value: formatHours(ack), tone: ack > 24 ? 'destructive' : ack > 12 ? 'amber' : 'mint', note: note.join(' · ') }
  if (m.ack_pending_count > 0) return { value: `${m.ack_pending_count} pending`, tone: 'amber', note: note.join(' · ') }
  return { value: '—', tone: 'dim', note: note.join(' · ') }
}
