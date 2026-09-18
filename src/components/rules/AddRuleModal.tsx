import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useProjects } from '@/features/projects/hooks'
import { useCreateRule } from '@/features/rules/hooks'
import {
  RULE_ACTION_LABELS,
  RULE_ACTION_TYPES,
  RULE_CONDITION_LABELS,
  RULE_PRIORITIES,
  RULE_TRIGGER_EVENTS,
  RULE_TRIGGER_LABELS,
} from '@/features/rules/types'
import type { RuleActionType, RuleCondition, RuleConditionType, RuleTemplate, RuleTriggerEvent } from '@/features/rules/types'
import { useWorkspaceStatuses } from '@/features/tasks/hooks'
import { useWorkspaceMembers } from '@/features/workspace-members/hooks'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

// RULE_CONDITION_TYPES_BUILDABLE -- "Sprint tertentu" (US-049 AC) SENGAJA
// tidak ditampilkan di sini -- desain "AW Add Rule.dc.html" sendiri tidak
// punya picker sprint (cuma needProject/projectChips di __vals(), tidak ada
// needSprint/sprintChips), dan codebase ini belum py fitur listing sprint
// di FE sama sekali (features/sprints/* tidak ada). Backend tetap
// menerima condition type "sprint" kalau suatu saat dikirim (skema
// generic), cuma builder ini tidak menawarkannya sampai ada UI sprint.
const RULE_CONDITION_TYPES_BUILDABLE: RuleConditionType[] = ['project', 'priority', 'assignee']

interface AddRuleModalProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  workspaceName: string
  // template (US-048 "→ GUNAKAN TEMPLATE") -- pre-fill trigger event/action
  // type saja, lihat komentar RULE_TEMPLATES.
  template?: RuleTemplate | null
}

// AddRuleModal (S4W-10/13, US-049, desain "AW Add Rule.dc.html") -- builder
// TCA, CREATE-ONLY (markup tidak punya mode edit -- rule cuma bisa dibuat,
// diaktifkan/nonaktifkan, atau dihapus dari grid, lihat AwRuleAutomationPage).
export default function AddRuleModal({ open, onClose, workspaceId, workspaceName, template = null }: AddRuleModalProps) {
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState<RuleTriggerEvent>('status_changed')
  const [statusId, setStatusId] = useState('')
  const [days, setDays] = useState('1')
  const [conditionType, setConditionType] = useState<RuleConditionType | ''>('')
  const [conditionProjectId, setConditionProjectId] = useState('')
  const [conditionPriority, setConditionPriority] = useState('')
  const [conditionUserId, setConditionUserId] = useState('')
  const [actionType, setActionType] = useState<RuleActionType>('assign')
  const [actionStatusId, setActionStatusId] = useState('')
  const [actionTargetUserId, setActionTargetUserId] = useState('')
  const [formError, setFormError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const statuses = useWorkspaceStatuses(workspaceId)
  const projects = useProjects(workspaceId)
  const members = useWorkspaceMembers(workspaceId)
  const create = useCreateRule(workspaceId)

  useEffect(() => {
    if (!open) return
    setName(template?.name ?? '')
    setTrigger(template?.triggerEvent ?? 'status_changed')
    setStatusId('')
    setDays(template?.triggerDays ? String(template.triggerDays) : '1')
    setConditionType(template?.conditionType ?? '')
    setConditionProjectId('')
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
  const activeProjects = (projects.data ?? []).filter((p) => !p.is_archived)
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
    ? 'berlaku di seluruh project workspace'
    : conditionType === 'project'
      ? `project = ${activeProjects.find((p) => p.id === conditionProjectId)?.name ?? '[pilih project]'}`
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
    if (conditionType === 'project' && !conditionProjectId) {
      setFormError(true)
      setErrorMsg('Pilih project untuk kondisi "Project tertentu".')
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
    if (conditionType === 'project') condition = { type: 'project', project_id: conditionProjectId }
    else if (conditionType === 'priority') condition = { type: 'priority', priority: conditionPriority }
    else if (conditionType === 'assignee') condition = { type: 'assignee', user_id: conditionUserId }

    create.mutate(
      {
        name: trimmedName,
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
    { num: 'STEP 1', label: 'TRIGGER', done: true },
    { num: 'STEP 2', label: 'CONDITION', done: conditionType !== '' || true },
    { num: 'STEP 3', label: 'ACTION', done: true },
  ]

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[760px]">
        <DialogHeader>
          <p className="font-mono text-[9px] tracking-[0.16em] text-signal">OPEN BUILDER · TRIGGER → CONDITION → ACTION</p>
          <DialogTitle>Rule baru di workspace {workspaceName}</DialogTitle>
          <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
            Rule level workspace berlaku di seluruh project kecuali dibatasi lewat kondisi. Rule langsung aktif setelah disimpan dan dapat
            dinonaktifkan kapan saja.
          </p>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-300px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap gap-2">
            {steps.map((s) => (
              <div key={s.num} className={cn('flex-1 min-w-[120px] border px-3 py-2', s.done ? 'border-signal bg-signal/10' : 'border-line-strong')}>
                <div className={cn('font-mono text-[8.5px] tracking-[0.12em]', s.done ? 'text-signal' : 'text-text-dim')}>{s.num}</div>
                <div className={cn('mt-1 font-mono text-[10px] tracking-[0.06em]', s.done ? 'text-text-bone' : 'text-text-muted')}>{s.label}</div>
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
                <div className="mb-2 font-mono text-[9px] tracking-[0.12em] text-text-dim">STATUS TARGET · HANYA STATUS AKTIF YANG DAPAT DIPILIH</div>
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
            {conditionType === 'project' && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {activeProjects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setConditionProjectId(p.id)}
                    className={cn(
                      'border px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.05em]',
                      conditionProjectId === p.id ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
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
