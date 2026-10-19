import type { AppNotification, NotificationPage } from '@/features/notifications/types'

// Data tiruan lonceng Editor (S6E-13, IG-144) -- BERSTATE di memori: tandai dibaca / semua dibaca mengubah hitung.
// Hanya dipakai `npm run dev:mock`; aplikasi nyata memakai GET /me/notifications (backend S6E-14).
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
  n(1, 'task_mention', 'Budi', 'menyebut Anda di komentar', 2, 5, false, '@Eka tolong cek data dari tim API sebelum review.'),
  n(2, 'task_comment', 'Citra', 'berkomentar pada task Anda', 3, 42, false, 'Bug sinkronisasi masih muncul di build terbaru.'),
  n(3, 'task_assigned', 'Pandu PM', 'menugaskan task kepada Anda', 6, 130, false),
  n(4, 'time_entry_approved', 'Pandu PM', 'menyetujui catatan waktu Anda (2,5 jam)', 2, 26 * 60, false),
  n(5, 'task_mention', 'Citra', 'menyebut Anda di komentar', 8, 3 * 24 * 60, true, '@Eka hasil uji beban sudah siap dicek.'),
  n(6, 'task_comment', 'Budi', 'berkomentar pada task Anda', 9, 4 * 24 * 60, true),
  n(7, 'pic_assigned', 'Pandu PM', 'menunjuk Anda sebagai PIC fase IN PROGRESS', 2, 5 * 24 * 60, true),
  n(8, 'task_regressed', null, 'task Anda dikembalikan ke IN PROGRESS', 8, 6 * 24 * 60, true),
  n(9, 'time_entry_rejected', 'Pandu PM', 'menolak catatan waktu Anda', 7, 7 * 24 * 60, true, 'Jam melebihi estimasi, mohon rinci.'),
  n(10, 'task_assigned', 'Pandu PM', 'menugaskan task kepada Anda', 10, 9 * 24 * 60, true),
  n(11, 'task_comment', 'Citra', 'berkomentar pada task Anda', 11, 12 * 24 * 60, true),
  n(12, 'task_mention', 'Budi', 'menyebut Anda di komentar', 12, 15 * 24 * 60, true),
  n(13, 'task_assigned', 'Pandu PM', 'menugaskan task kepada Anda', 1, 20 * 24 * 60, true),
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
