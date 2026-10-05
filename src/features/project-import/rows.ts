import { formatDateDMY } from '@/lib/date'

import type { SprintImportRow } from './types'

// sprintRowNote -- baris catatan kecil di pratinjau: alasan kalau dilewati,
// selain itu status + rentang tanggal sprint (desain: "STATUS BACKLOG · HIGH · DUE ...").
export function sprintRowNote(row: SprintImportRow): string {
  if (row.status === 'skipped') return row.reason ?? 'Dilewati'
  const parts = [`STATUS ${row.sprint_status.toUpperCase()}`]
  if (row.start_date || row.end_date) parts.push(`${formatDateDMY(row.start_date)} → ${formatDateDMY(row.end_date)}`)
  return parts.join(' · ')
}

// sprintRowTitle -- "SPR-01 · Sprint 1"; baris tanpa kode/nama menyebut nomor barisnya.
export function sprintRowTitle(row: SprintImportRow): string {
  if (!row.code && !row.name) return `Baris ${row.row} — (kosong)`
  if (row.status === 'skipped') return `Baris ${row.row} — ${[row.code, row.name].filter(Boolean).join(' · ') || '(kosong)'}`
  return `${row.code} · ${row.name}`
}
