import type { AppNotification, NotificationPage } from '@/features/notifications/types'

// Data tiruan lonceng Editor (S6E-13, IG-144) -- BERSTATE di memori: tandai dibaca / semua dibaca mengubah hitung.
// Hanya dipakai `npm run dev:mock`; aplikasi nyata memakai GET /me/notifications (backend S6E-14, bentuk sama).
const MIN = 60_000
const QUEST = 'mock-proj-quest'
const ago = (min: number) => new Date(Date.now() - min * MIN).toISOString()

function n(i: number, type: string, actor: string | null, title: string, taskN: number, minAgo: number, read: boolean, body: string | null = null): AppNotification {
  return {
    id: `mock-notif-${i}`,
    type,
    actor_name: actor,
    title,
    body,
    entity_type: 'task',
    entity_id: `${QUEST}-mt-${taskN}`,
    project_id: QUEST,
    task_code: `QST-${String(taskN).padStart(3, '0')}`,
    project_name: 'QuestLog',
    is_read: read,
    created_at: ago(minAgo),
  }
}

const items: AppNotification[] = [
  n(1, 'task_mention', 'Budi', 'Anda di-mention di QST-002', 2, 5, false, 'Budi menyebut Anda di task "Implementasi daftar quest".'),
  n(2, 'task_comment', 'Citra', 'Komentar baru di QST-003', 3, 42, false, 'Ada komentar baru pada task "Perbaiki bug sinkronisasi".'),
  n(3, 'task_assigned', 'Pandu PM', 'Task ditugaskan kepada Anda -- QST-006', 6, 130, false, 'Anda ditugaskan pada task "Susun dokumentasi API".'),
  n(4, 'timesheet_approved', 'Pandu PM', 'Entri waktu disetujui -- QST-002', 2, 26 * 60, false, 'Entri waktu Anda pada task "Implementasi daftar quest" disetujui.'),
  n(5, 'task_mention', 'Citra', 'Anda di-mention di QST-008', 8, 3 * 24 * 60, true, 'Citra menyebut Anda di task "Uji beban server".'),
  n(6, 'task_comment', 'Budi', 'Komentar baru di QST-009', 9, 4 * 24 * 60, true),
  n(7, 'task_assigned', 'Pandu PM', 'Task ditugaskan kepada Anda -- QST-002', 2, 5 * 24 * 60, true),
  n(8, 'task_regressed', null, 'Task Mengalami Regresi', 8, 6 * 24 * 60, true, 'Task "Uji beban server" dikembalikan ke IN PROGRESS.'),
  n(9, 'timesheet_rejected', 'Pandu PM', 'Entri waktu ditolak -- QST-007', 7, 7 * 24 * 60, true, 'Jam melebihi estimasi, mohon rinci.'),
  n(10, 'task_assigned', 'Pandu PM', 'Task ditugaskan kepada Anda -- QST-010', 10, 9 * 24 * 60, true),
  n(11, 'task_comment', 'Citra', 'Komentar baru di QST-011', 11, 12 * 24 * 60, true),
  n(12, 'task_mention', 'Budi', 'Anda di-mention di QST-012', 12, 15 * 24 * 60, true),
  n(13, 'task_assigned', 'Pandu PM', 'Task ditugaskan kepada Anda -- QST-001', 1, 20 * 24 * 60, true),
]

export function listNotifications(page: number, perPage: number): NotificationPage {
  const start = (page - 1) * perPage
  return { items: items.slice(start, start + perPage), total: items.length, unread_count: items.filter((x) => !x.is_read).length }
}

export function markNotificationRead(id: string): boolean {
  const hit = items.find((x) => x.id === id)
  if (!hit) return false
  hit.is_read = true
  return true
}

export function markAllRead(): number {
  const pending = items.filter((x) => !x.is_read)
  pending.forEach((x) => (x.is_read = true))
  return pending.length
}
