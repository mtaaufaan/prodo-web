import type { AppNotification } from './types'

export interface NotificationMeta {
  icon: string
  label: string
  tone: string // kelas warna Tailwind (teks + border)
}

const MENTION: NotificationMeta = { icon: '@', label: 'MENTION', tone: 'border-signal text-signal' }
const COMMENT: NotificationMeta = { icon: '✎', label: 'KOMENTAR', tone: 'border-violet text-violet' }
const ASSIGNED: NotificationMeta = { icon: '◉', label: 'DITUGASKAN', tone: 'border-mint text-mint' }
const TIMESHEET: NotificationMeta = { icon: '◷', label: 'TIMESHEET', tone: 'border-amber text-amber' }
const REGRESSED: NotificationMeta = { icon: '↺', label: 'TASK', tone: 'border-amber text-amber' }
const OTHER: NotificationMeta = { icon: '•', label: 'INFO', tone: 'border-text-dim text-text-muted' }

// Ikon/label/warna per tipe notifikasi (komentar, mention, task ditugaskan, timesheet); tipe lain -> generik.
export function notificationMeta(type: string): NotificationMeta {
  if (type === 'task_mention' || type === 'task_mention_digest') return MENTION
  if (type === 'task_comment') return COMMENT
  if (type === 'task_assigned' || type === 'pic_assigned' || type === 'rule_action_notify') return ASSIGNED
  if (type.startsWith('time_entry') || type.startsWith('timesheet')) return TIMESHEET
  if (type === 'task_regressed') return REGRESSED
  return OTHER
}

// Waktu relatif Indonesia ("5 menit lalu"); masa depan/<1 menit -> "baru saja".
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = Math.floor((now - Date.parse(iso)) / 1000)
  if (!Number.isFinite(diff) || diff < 60) return 'baru saja'
  const minutes = Math.floor(diff / 60)
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'kemarin'
  return `${days} hari lalu`
}

// Tautan dalam: notifikasi task membuka Board project terkait dengan Task Detail (?task=); selain itu null.
export function notificationHref(n: AppNotification, workspaceId: string): string | null {
  if (n.entity_type === 'task' && n.entity_id && n.project_id) {
    return `/workspaces/${workspaceId}/projects/${n.project_id}/board?task=${n.entity_id}`
  }
  return null
}

// Badge: kosong bila 0, "99+" bila lebih dari 99.
export function badgeLabel(unread: number): string {
  if (unread <= 0) return ''
  return unread > 99 ? '99+' : String(unread)
}
