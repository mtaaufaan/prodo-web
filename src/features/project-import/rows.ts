import { formatDateDMY } from '@/lib/date'

import type { SprintImportRow, TaskImportRow } from './types'

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

// taskRowTitle -- judul task; baris dilewati menyebut nomor barisnya.
export function taskRowTitle(row: TaskImportRow): string {
  if (!row.title) return `Baris ${row.row} — (judul kosong)`
  return row.status === 'skipped' ? `Baris ${row.row} — ${row.title}` : row.title
}

// taskRowNote -- alasan kalau dilewati; selain itu ringkasan
// "STATUS X · HIGH · DUE 08/10/2026 · SPR-01 · assignee" (desain PM Import CSV).
export function taskRowNote(row: TaskImportRow): string {
  if (row.status === 'skipped') return row.reason ?? 'Dilewati'
  const parts = [`STATUS ${row.task_status}`, row.priority.toUpperCase()]
  if (row.due_date) parts.push(`DUE ${formatDateDMY(row.due_date)}`)
  if (row.sprint) parts.push(row.sprint)
  parts.push(row.assignee ? row.assignee.split(';').join(', ') : 'tanpa assignee')
  return parts.join(' · ')
}

// importRowView -- judul+catatan baris pratinjau untuk jenis import apa pun
// (baris sprint punya `code`, baris task punya `title`).
export function importRowView(row: SprintImportRow | TaskImportRow): { title: string; note: string } {
  return 'code' in row ? { title: sprintRowTitle(row), note: sprintRowNote(row) } : { title: taskRowTitle(row), note: taskRowNote(row) }
}
