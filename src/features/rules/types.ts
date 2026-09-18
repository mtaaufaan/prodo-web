// Rule Automation (S4W-10/12/13, EPIC 7, US-048/049/051/052/053, desain
// "AW Rule Automation.dc.html"+"AW Add Rule.dc.html"). Katalog Trigger/
// Condition/Action PERSIS backlog.md US-049 AC -- lihat komentar backend
// internal/service/rule.go untuk daftar resminya.
export const RULE_TRIGGER_EVENTS = ['status_changed', 'assignee_changed', 'due_date_approaching', 'task_created', 'comment_added'] as const
export type RuleTriggerEvent = (typeof RULE_TRIGGER_EVENTS)[number]

export const RULE_TRIGGER_LABELS: Record<RuleTriggerEvent, string> = {
  status_changed: 'Status task berubah',
  assignee_changed: 'Assignee berubah',
  due_date_approaching: 'Due date mendekati',
  task_created: 'Task dibuat',
  comment_added: 'Komentar ditambahkan',
}

// RULE_CONDITION_TYPES -- "Tanpa kondisi" TIDAK masuk daftar ini,
// direpresentasikan lewat condition=null (bukan value string), sama pola
// backend.
export const RULE_CONDITION_TYPES = ['project', 'sprint', 'priority', 'assignee'] as const
export type RuleConditionType = (typeof RULE_CONDITION_TYPES)[number]

export const RULE_CONDITION_LABELS: Record<RuleConditionType, string> = {
  project: 'Project tertentu',
  sprint: 'Sprint tertentu',
  priority: 'Priority tertentu',
  assignee: 'Assignee tertentu',
}

export const RULE_ACTION_TYPES = ['change_status', 'notify', 'assign', 'create_subtask'] as const
export type RuleActionType = (typeof RULE_ACTION_TYPES)[number]

export const RULE_ACTION_LABELS: Record<RuleActionType, string> = {
  change_status: 'Ubah status',
  notify: 'Kirim notifikasi',
  assign: 'Assign ke user',
  create_subtask: 'Buat sub-task otomatis',
}

export const RULE_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const

export interface RuleTrigger {
  event: RuleTriggerEvent
  status_id?: string
  days?: number
}

export interface RuleCondition {
  type: RuleConditionType
  project_id?: string
  sprint_id?: string
  priority?: string
  user_id?: string
}

export interface RuleAction {
  type: RuleActionType
  status_id?: string
  target_user_id?: string
}

export interface Rule {
  id: string
  name: string
  trigger_config: RuleTrigger
  condition_config: RuleCondition | null
  action_config: RuleAction
  is_active: boolean
  inactive_reason: string | null
  is_template: boolean
  created_by: string
  created_at: string
  runs: number
}

export interface RuleExecution {
  id: string
  rule_id: string
  rule_name: string
  trigger_event: Record<string, unknown>
  triggered_by: string | null
  executed_at: string
  status: 'completed' | 'failed'
  action_taken: Record<string, unknown> | null
  error_message: string | null
}

export interface CreateRuleValues {
  name: string
  trigger: RuleTrigger
  condition: RuleCondition | null
  action: RuleAction
}

// RuleTemplate/RULE_TEMPLATES -- Template Library (US-048), BAWAAN saja --
// "Simpan sebagai Template" (US-050, Could Have v1.1) di luar cakupan
// S4W-10 (3 SP-nya cuma CRUD+katalog statis). Template pre-fill STRUKTUR
// (trigger event/action type) saja -- status/project/member spesifik tetap
// diisi user sendiri (US-048 AC: "mengisi parameter yang diperlukan
// sebelum mengaktifkan"), tidak bisa di-hardcode karena UUID-nya beda per
// workspace.
export interface RuleTemplate {
  key: string
  name: string
  desc: string
  triggerEvent: RuleTriggerEvent
  triggerDays?: number
  conditionType: RuleConditionType | ''
  actionType: RuleActionType
}

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    key: 'assign-on-status',
    name: 'Auto-assign saat status berubah',
    desc: 'Tugaskan member tertentu otomatis begitu task pindah ke status target.',
    triggerEvent: 'status_changed',
    conditionType: '',
    actionType: 'assign',
  },
  {
    key: 'notify-on-status',
    name: 'Notifikasi saat status berubah',
    desc: 'Kirim notifikasi ke member tertentu setiap kali task pindah ke status target.',
    triggerEvent: 'status_changed',
    conditionType: '',
    actionType: 'notify',
  },
  {
    key: 'due-date-reminder',
    name: 'Reminder H-3 sebelum due date',
    desc: 'Kirim notifikasi pengingat 3 hari sebelum due date task jatuh tempo.',
    triggerEvent: 'due_date_approaching',
    triggerDays: 3,
    conditionType: '',
    actionType: 'notify',
  },
  {
    key: 'due-date-status-change',
    name: 'Ubah status saat due date mendekati',
    desc: 'Pindahkan task ke status tertentu otomatis saat mendekati due date.',
    triggerEvent: 'due_date_approaching',
    triggerDays: 1,
    conditionType: '',
    actionType: 'change_status',
  },
]
