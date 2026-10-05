import { RULE_ACTION_LABELS, RULE_CONDITION_LABELS, RULE_TRIGGER_LABELS } from './types'
import type { Rule, RuleExecution } from './types'

// ruleSummary -- teks JIKA/DAN/MAKA baris Rule Aktif. Menyertakan parameter
// yang menentukan perilaku rule (status target, hari H-n, priority) supaya
// dua rule "Status berubah" tidak tampak identik. statusName memetakan
// status_id ke nama (status template workspace ATAU status project).
export function ruleSummary(rule: Rule, statusName: (id?: string) => string | undefined) {
  const { trigger_config: trg, condition_config: cond, action_config: act } = rule
  const trgStatus = statusName(trg.status_id)
  const actStatus = statusName(act.status_id)

  const triggerText =
    trg.event === 'status_changed'
      ? `STATUS BERUBAH${trgStatus ? ` → ${trgStatus}` : ''}`
      : trg.event === 'due_date_approaching'
        ? `DUE DATE H-${trg.days ?? 1}`
        : RULE_TRIGGER_LABELS[trg.event].toUpperCase()
  const conditionText = cond
    ? cond.type === 'priority' && cond.priority
      ? `${RULE_CONDITION_LABELS.priority} (${cond.priority})`
      : RULE_CONDITION_LABELS[cond.type]
    : 'tanpa kondisi'
  const actionText =
    act.type === 'change_status' && actStatus ? `${RULE_ACTION_LABELS.change_status} → ${actStatus}` : RULE_ACTION_LABELS[act.type]
  return { triggerText, conditionText, actionText }
}

// countRecentFailures -- kartu "Gagal 7 Hari" harus menghitung SELURUH log,
// bukan log yang sudah disaring filter hasil di tab Log Eksekusi.
export function countRecentFailures(logs: RuleExecution[], now: number, days = 7): number {
  return logs.filter((l) => l.status === 'failed' && (now - new Date(l.executed_at).getTime()) / 86400000 <= days).length
}
