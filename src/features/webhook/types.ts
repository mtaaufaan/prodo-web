// Webhook (Track S4G, desain "GA Webhook.dc.html" + "GA Add Webhook.dc.html").
// SUPPORTED_EVENTS -- CUMA 3 dari 10 event desain yang punya trigger nyata
// (backend internal/service/webhook.go SupportedWebhookEvents) -- 7 lainnya
// (task.*/comment.created/rule.executed) sengaja TIDAK ditawarkan, tabel/
// service-nya belum ada (implementation_gaps.md IG-44).
export const SUPPORTED_WEBHOOK_EVENTS = ['project.created', 'project.updated', 'project.deleted'] as const

export type WebhookEvent = (typeof SUPPORTED_WEBHOOK_EVENTS)[number]

// workspace_id/project_id/project_name (S4W-14, US-054, "AW Webhook.
// dc.html") -- cakupan workspace, PERSIS SATU dari org_id/workspace_id
// terisi (webhook_configs.chk_webhook_configs_scope). project_id NULL
// berarti LINGKUP "Seluruh workspace".
export interface Webhook {
  id: string
  org_id: string | null
  org_name: string | null
  workspace_id: string | null
  project_id: string | null
  project_name: string | null
  name: string
  url: string
  events: string[]
  is_active: boolean
  created_at: string
  sent_30d: number
  failed_30d: number
  last_event_at: string | null
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  webhook_name: string
  event_type: string
  payload: Record<string, unknown>
  attempt_number: number
  status: 'delivered' | 'failed'
  http_status: number | null
  response_body: string | null
  error_message: string | null
  duration_ms: number | null
  created_at: string
}

export interface WebhookFormValues {
  org_id: string
  name: string
  url: string
  events: string[]
}

// WorkspaceWebhookFormValues -- LINGKUP "AW Add Webhook.dc.html" pakai
// project_id (bukan org_id), kosong berarti "Seluruh workspace".
export interface WorkspaceWebhookFormValues {
  project_id: string
  name: string
  url: string
  events: string[]
}
