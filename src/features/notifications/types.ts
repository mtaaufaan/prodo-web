// Notification Bell (US-034, S6E-13, IG-144). Kontrak usulan untuk backend S6E-14:
// GET /me/notifications?workspace_id=&page=&per_page= -> NotificationPage (terbaru dulu, >30 hari tidak dikirim).
export interface AppNotification {
  id: string
  // task_mention | task_mention_digest | task_comment | task_assigned | pic_assigned | time_entry_* | task_regressed | ...
  type: string
  actor_name: string | null
  title: string
  body: string | null
  entity_type: string | null
  entity_id: string | null
  project_id: string | null
  task_code: string | null
  project_name: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationPage {
  items: AppNotification[]
  total: number
  unread_count: number
}
