// Webhook (Track S4G, desain "GA Webhook.dc.html" + "GA Add Webhook.dc.html").
// SUPPORTED_EVENTS -- CUMA 3 dari 10 event desain yang punya trigger nyata
// (backend internal/service/webhook.go SupportedWebhookEvents) -- 7 lainnya
// (task.*/comment.created/rule.executed) sengaja TIDAK ditawarkan, tabel/
// service-nya belum ada (implementation_gaps.md IG-44).
export const SUPPORTED_WEBHOOK_EVENTS = ['project.created', 'project.updated', 'project.deleted'] as const

export type WebhookEvent = (typeof SUPPORTED_WEBHOOK_EVENTS)[number]

export interface Webhook {
  id: string
  org_id: string | null
  org_name: string | null
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
