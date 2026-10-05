import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCreateProjectRule } from '@/features/rules/hooks'
import {
  RULE_ACTION_LABELS,
  RULE_ACTION_TYPES,
  RULE_CONDITION_LABELS,
  RULE_PRIORITIES,
  RULE_TRIGGER_EVENTS,
  RULE_TRIGGER_LABELS,
} from '@/features/rules/types'
import type { RuleActionType, RuleCondition, RuleConditionType, RuleTemplate, RuleTriggerEvent } from '@/features/rules/types'
import { useProjectStatuses } from '@/features/tasks/hooks'
import { useProjectMembers } from '@/features/project-members/hooks'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

// RULE_CONDITION_TYPES_BUILDABLE -- versi project dari AddRuleModal.tsx:
// "Project tertentu" DIHAPUS (rule ini sudah terikat SATU project, kondisi
// itu jadi redundan) -- "Sprint tertentu" tetap tidak ditampilkan, alasan
// sama persis komentar AddRuleModal.tsx (belum ada UI listing sprint utuh
// yang cocok dipakai sebagai picker builder ini).
const RULE_CONDITION_TYPES_BUILDABLE: RuleConditionType[] = ['priority', 'assignee']

interface AddProjectRuleModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  projectName: string
  template?: RuleTemplate | null
}

// AddProjectRuleModal (Track S5B, "Rule Builder.dc.html") -- versi project
// dari AddRuleModal.tsx (AW): status target trigger/action diambil dari
// status project ini sendiri (salinan independen, US-019), bukan lagi
// template workspace -- "Daftar status mengacu status aktif project saat
// ini — UNDEFINED tidak tersedia" (desain).
export default function AddProjectRuleModal({ open, onClose, projectId, projectName, template = null }: AddProjectRuleModalProps) {
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState<RuleTriggerEvent>('status_changed')
  const [statusId, setStatusId] = useState('')
  const [days, setDays] = useState('1')
  const [conditionType, setConditionType] = useState<RuleConditionType | ''>('')
  const [conditionPriority, setConditionPriority] = useState('')
  const [conditionUserId, setConditionUserId] = useState('')
  const [actionType, setActionType] = useState<RuleActionType>('assign')
  const [actionStatusId, setActionStatusId] = useState('')
  const [actionTargetUserId, setActionTargetUserId] = useState('')
  const [formError, setFormError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const statuses = useProjectStatuses(projectId)
  const members = useProjectMembers(projectId, true)
  const create = useCreateProjectRule(projectId)

  useEffect(() => {
    if (!open) return
    setName(template?.name ?? '')
    setTrigger(template?.triggerEvent ?? 'status_changed')
    setStatusId('')
    setDays(template?.triggerDays ? String(template.triggerDays) : '1')
    setConditionType(template?.conditionType === 'project' ? '' : (template?.conditionType ?? ''))
    setConditionPriority('')
    setConditionUserId('')
    setActionType(template?.actionType ?? 'assign')
    setActionStatusId('')
    setActionTargetUserId('')
    setFormError(false)
    setErrorMsg('')
    setSavedMsg(null)
    create.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template])

  const activeStatuses = (statuses.data ?? []).filter((s) => !s.is_undefined)
  const activeMembers = members.data ?? []

  const needsStatus = trigger === 'status_changed'
  const needsDays = trigger === 'due_date_approaching'
  const needsTarget = actionType === 'notify' || actionType === 'assign'

  const triggerText = needsStatus
    ? `status task berubah → ${statuses.data?.find((s) => s.id === statusId)?.name ?? '[pilih status]'}`
    : needsDays
      ? `due date mendekati ${days || '1'} hari`
      : RULE_TRIGGER_LABELS[trigger].toLowerCase()
  const conditionText = !conditionType
    ? 'berlaku di seluruh task project ini'
    : conditionType === 'priority'
      ? `priority = ${conditionPriority || '[pilih priority]'}`
      : `assignee = ${activeMembers.find((m) => m.user_id === conditionUserId)?.display_name ?? '[pilih assignee]'}`
  const actionText = needsTarget
    ? `${RULE_ACTION_LABELS[actionType].toLowerCase()} → ${activeMembers.find((m) => m.user_id === actionTargetUserId)?.display_name ?? '[pilih member]'}`
    : actionType === 'change_status'
      ? `ubah status → ${statuses.data?.find((s) => s.id === actionStatusId)?.name ?? '[pilih status]'}`
      : RULE_ACTION_LABELS[actionType].toLowerCase()

  const onSave = () => {
    const trimmedName = name.trim()
    if (trimmedName.length < 4) {
      setFormError(true)
      setErrorMsg('Nama rule minimal 4 karakter.')
      return
    }
    if (needsStatus && !statusId) {
      setFormError(true)
      setErrorMsg('Pilih status target untuk trigger ini.')
      return
    }
    if (conditionType === 'priority' && !conditionPriority) {
      setFormError(true)
      setErrorMsg('Pilih priority untuk kondisi "Priority tertentu".')
      return
    }
    if (conditionType === 'assignee' && !conditionUserId) {
      setFormError(true)
      setErrorMsg('Pilih assignee untuk kondisi "Assignee tertentu".')
      return
    }
    if (actionType === 'change_status' && !actionStatusId) {
      setFormError(true)
      setErrorMsg('Pilih status tujuan untuk action ini.')
      return
    }
    if (needsTarget && !actionTargetUserId) {
      setFormError(true)
      setErrorMsg('Pilih member tujuan untuk action ini.')
      return
    }

    let condition: RuleCondition | null = null
    if (conditionType === 'priority') condition = { type: 'priority', priority: conditionPriority }
    else if (conditionType === 'assignee') condition = { type: 'assignee', user_id: conditionUserId }

    create.mutate(
      {
        name: trimmedName,
        template_key: template?.key,
        trigger: { event: trigger, status_id: needsStatus ? statusId : undefined, days: needsDays ? Number(days) : undefined },
        condition,
        action: {
          type: actionType,
          status_id: actionType === 'change_status' ? actionStatusId : undefined,
          target_user_id: needsTarget ? actionTargetUserId : undefined,
        },
      },
      {
        onSuccess: () => {
          setSavedMsg(`Rule "${trimmedName}" disimpan dan langsung ACTIVE. Eksekusinya akan muncul di tab Log Eksekusi. Tercatat di Audit Trail workspace.`)
          setFormError(false)
          setName('')
        },
      },
    )
  }

  const saveError = create.error instanceof ApiError ? create.error : null
  const steps = [
    { num: 'STEP 1', label: 'TRIGGER' },
    { num: 'STEP 2', label: 'CONDITION' },
    { num: 'STEP 3', label: 'ACTION' },
  ]

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[760px]">
        <DialogHeader>
          <p className="font-mono text-[9px] tracking-[0.16em] text-signal">OPEN BUILDER · TRIGGER → CONDITION → ACTION</p>
          <DialogTitle>Rule baru di project {projectName}</DialogTitle>
          <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
            Rule ini berlaku khusus untuk task di project ini. Rule langsung aktif setelah disimpan dan dapat
            dinonaktifkan kapan saja.
          </p>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-300px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap gap-2">
            {steps.map((s) => (
              <div key={s.num} className="flex-1 min-w-[120px] border border-signal bg-signal/10 px-3 py-2">
                <div className="font-mono text-[8.5px] tracking-[0.12em] text-signal">{s.num}</div>
                <div className="mt-1 font-mono text-[10px] tracking-[0.06em] text-text-bone">{s.label}</div>
              </div>
            ))}
          </div>

          {savedMsg && (
            <div className="relative border border-mint p-2.5 pr-8 font-mono text-[10px] leading-relaxed text-mint">
              ✓ {savedMsg}
              <button type="button" onClick={() => setSavedMsg(null)} className="absolute right-2 top-2 opacity-60 hover:opacity-100" title="Tutup">
                ✕
              </button>
            </div>
          )}

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-text-dim">NAMA RULE</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setFormError(false)
              }}
              placeholder="Auto-assign QA saat masuk Under Review"
              className={cn(
                'w-full border bg-input-bg px-3 py-2.5 text-[13px] text-text-bone outline-none focus-visible:border-signal',
                formError && name.trim().length < 4 ? 'border-destructive' : 'border-line-strong',
              )}
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-blue">1 · TRIGGER — APA YANG MEMICU</label>
            <div className="mb-2.5 flex flex-wrap gap-2">
              {RULE_TRIGGER_EVENTS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTrigger(t)
                    setFormError(false)
                  }}
                  className={cn(
                    'border px-3 py-2 font-mono text-[10px] tracking-[0.04em]',
                    trigger === t ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                  )}
                >
                  {RULE_TRIGGER_LABELS[t]}
                </button>
              ))}
            </div>
            {needsStatus && (
              <div>
                <div className="mb-2 font-mono text-[9px] tracking-[0.12em] text-text-dim">
                  STATUS TARGET · MENGACU STATUS AKTIF PROJECT INI — UNDEFINED TIDAK TERSEDIA
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeStatuses.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setStatusId(s.id)
                        setFormError(false)
                      }}
                      className={cn(
                        'border px-2.5 py-1.5 font-mono text-[9.5px] font-semibold tracking-[0.05em]',
                        statusId === s.id ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {needsDays && (
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[10px] text-text-muted">AMBANG</span>
                <input
                  value={days}
                  onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-20 border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[12px] text-text-bone outline-none"
                />
                <span className="font-mono text-[10px] text-text-muted">HARI SEBELUM DUE DATE</span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-amber">2 · CONDITION — PENYARINGAN (OPSIONAL)</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setConditionType('')
                  setFormError(false)
                }}
                className={cn(
                  'border px-3 py-2 font-mono text-[10px] tracking-[0.04em]',
                  conditionType === '' ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                )}
              >
                TANPA KONDISI
              </button>
              {RULE_CONDITION_TYPES_BUILDABLE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setConditionType(c)
                    setFormError(false)
                  }}
                  className={cn(
                    'border px-3 py-2 font-mono text-[10px] tracking-[0.04em]',
                    conditionType === c ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                  )}
                >
                  {RULE_CONDITION_LABELS[c]}
                </button>
              ))}
            </div>
            {conditionType === 'priority' && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {RULE_PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setConditionPriority(p)}
                    className={cn(
                      'border px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.05em]',
                      conditionPriority === p ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {conditionType === 'assignee' && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {activeMembers.map((m) => (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => setConditionUserId(m.user_id)}
                    className={cn(
                      'border px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.05em]',
                      conditionUserId === m.user_id ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                    )}
                  >
                    {m.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-mint">3 · ACTION — APA YANG DILAKUKAN</label>
            <div className="flex flex-wrap gap-2">
              {RULE_ACTION_TYPES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setActionType(a)
                    setFormError(false)
                  }}
                  className={cn(
                    'border px-3 py-2 font-mono text-[10px] tracking-[0.04em]',
                    actionType === a ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                  )}
                >
                  {RULE_ACTION_LABELS[a]}
                </button>
              ))}
            </div>
            {actionType === 'change_status' && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {activeStatuses.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActionStatusId(s.id)}
                    className={cn(
                      'border px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.05em]',
                      actionStatusId === s.id ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            {needsTarget && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {activeMembers.map((m) => (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => setActionTargetUserId(m.user_id)}
                    className={cn(
                      'border px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.05em]',
                      actionTargetUserId === m.user_id ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                    )}
                  >
                    {m.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border border-line-strong p-3.5">
            <div className="mb-2.5 font-mono text-[9px] tracking-[0.14em] text-text-dim">RINGKASAN RULE</div>
            <div className="font-mono text-[10.5px] leading-loose text-text-bone">
              <span className="text-blue">JIKA</span> {triggerText}
              <br />
              <span className="text-amber">DAN</span> {conditionText}
              <br />
              <span className="text-mint">MAKA</span> {actionText}
            </div>
          </div>

          {formError && <p className="border border-destructive p-2.5 font-mono text-[10px] leading-relaxed text-destructive">⚠ {errorMsg}</p>}
          {saveError && <p className="text-[11px] text-destructive">{saveError.message}</p>}
        </div>

        <DialogFooter>
          <Button type="button" disabled={create.isPending} onClick={onSave} className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]">
            {create.isPending ? 'Menyimpan...' : 'Simpan & Aktifkan'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
