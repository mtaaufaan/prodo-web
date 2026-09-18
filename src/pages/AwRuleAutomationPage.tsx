import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import AddRuleModal from '@/components/rules/AddRuleModal'
import { useDeleteRule, useRuleExecutions, useRules, useToggleRuleActive } from '@/features/rules/hooks'
import { RULE_ACTION_LABELS, RULE_CONDITION_LABELS, RULE_TEMPLATES, RULE_TRIGGER_LABELS } from '@/features/rules/types'
import type { Rule, RuleExecution, RuleTemplate } from '@/features/rules/types'
import { useWorkspace } from '@/features/workspaces/hooks'
import { cn } from '@/lib/utils'

function StatCard({ label, value, note, tone }: { label: string; value: string; note: string; tone?: 'mint' | 'destructive' | 'amber' }) {
  return (
    <div className="min-w-[130px] flex-1 border border-line bg-panel px-3.5 py-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">{label}</div>
      <div
        className={cn(
          'mt-1 text-xl font-extrabold',
          tone === 'mint' && 'text-mint',
          tone === 'destructive' && 'text-destructive',
          tone === 'amber' && 'text-amber',
        )}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[8.5px] text-text-dim">{note}</div>
    </div>
  )
}

function ruleSummary(rule: Rule) {
  const triggerText =
    rule.trigger_config.event === 'status_changed'
      ? `STATUS BERUBAH`
      : rule.trigger_config.event === 'due_date_approaching'
        ? `DUE DATE H-${rule.trigger_config.days ?? 1}`
        : RULE_TRIGGER_LABELS[rule.trigger_config.event].toUpperCase()
  const conditionText = rule.condition_config ? RULE_CONDITION_LABELS[rule.condition_config.type] : 'tanpa kondisi'
  const actionText = RULE_ACTION_LABELS[rule.action_config.type]
  return { triggerText, conditionText, actionText }
}

function RuleRow({ rule, onToggle, onDelete, toggling }: { rule: Rule; onToggle: () => void; onDelete: () => void; toggling: boolean }) {
  const { triggerText, conditionText, actionText } = ruleSummary(rule)
  const statusLabel = rule.is_active ? 'ACTIVE' : rule.inactive_reason ? 'INACTIVE' : 'NONAKTIF'
  const statusTone = rule.is_active ? 'text-mint border-mint' : rule.inactive_reason ? 'text-destructive border-destructive' : 'text-text-dim border-line-strong'

  return (
    <div className="flex flex-col gap-2.5 border-t border-line px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className={cn('text-[13.5px] font-semibold', rule.is_active ? 'text-text-bone' : 'text-text-muted')}>{rule.name}</div>
          <div className="mt-1 font-mono text-[8.5px] text-text-dim">
            LEVEL WORKSPACE · DIBUAT {new Date(rule.created_at).toLocaleDateString('id-ID')} · {rule.runs} EKSEKUSI
          </div>
        </div>
        <span className={cn('whitespace-nowrap border px-2 py-0.5 font-mono text-[9px] font-semibold', statusTone)}>{statusLabel}</span>
      </div>
      <div className="font-mono text-[9.5px] leading-relaxed text-text-muted">
        <span className="text-blue">JIKA</span> {triggerText} · <span className="text-amber">DAN</span> {conditionText} ·{' '}
        <span className="text-mint">MAKA</span> {actionText}
      </div>
      {rule.inactive_reason && (
        <div className="border border-destructive p-2.5 font-mono text-[9px] leading-relaxed text-destructive">
          ⚠ {rule.inactive_reason} — perbarui trigger/kondisi ke status yang valid sebelum diaktifkan kembali. Notifikasi in-app dan email sudah
          dikirim ke pembuat rule.
        </div>
      )}
      <div className="flex flex-wrap gap-3.5">
        <button
          type="button"
          disabled={toggling}
          onClick={onToggle}
          className={cn('font-mono text-[10px] hover:underline disabled:opacity-50', rule.is_active ? 'text-text-muted' : 'text-mint')}
        >
          {rule.is_active ? '⏸ NONAKTIFKAN' : '▶ AKTIFKAN'}
        </button>
        <button type="button" onClick={onDelete} className="font-mono text-[10px] text-destructive hover:underline">
          ⊘ HAPUS
        </button>
      </div>
    </div>
  )
}

function TemplateRow({ template, onUse }: { template: RuleTemplate; onUse: () => void }) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-line px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-text-bone">{template.name}</div>
          <div className="mt-1 text-[11.5px] text-text-muted">{template.desc}</div>
        </div>
        <span className="whitespace-nowrap border border-blue px-2 py-0.5 font-mono text-[9px] text-blue">BAWAAN</span>
      </div>
      <div className="font-mono text-[9.5px] leading-relaxed text-text-muted">
        <span className="text-blue">JIKA</span> {RULE_TRIGGER_LABELS[template.triggerEvent].toLowerCase()} ·{' '}
        <span className="text-amber">DAN</span> {template.conditionType ? RULE_CONDITION_LABELS[template.conditionType] : 'tanpa kondisi'} ·{' '}
        <span className="text-mint">MAKA</span> {RULE_ACTION_LABELS[template.actionType].toLowerCase()}
      </div>
      <button type="button" onClick={onUse} className="self-start font-mono text-[10px] text-signal hover:underline">
        → GUNAKAN TEMPLATE
      </button>
    </div>
  )
}

function ExecutionRow({ execution }: { execution: RuleExecution }) {
  return (
    <div className="border-t border-line px-4 py-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            'border px-1.5 py-0.5 font-mono text-[9px] font-semibold',
            execution.status === 'completed' ? 'border-mint text-mint' : 'border-destructive text-destructive',
          )}
        >
          {execution.status === 'completed' ? 'BERHASIL' : 'GAGAL'}
        </span>
        <span className="text-[12px] font-semibold text-text-bone">{execution.rule_name}</span>
        <span className="ml-auto whitespace-nowrap font-mono text-[9px] text-text-dim">{new Date(execution.executed_at).toLocaleString('id-ID')}</span>
      </div>
      {execution.error_message && <div className="mt-1.5 font-mono text-[9px] leading-relaxed text-destructive">⚠ {execution.error_message}</div>}
    </div>
  )
}

type ViewTab = 'Rule Aktif' | 'Template Library' | 'Log Eksekusi'

// AwRuleAutomationPage (S4W-10/12/13, EPIC 7, desain "AW Rule Automation.
// dc.html"+"AW Add Rule.dc.html") -- reuse RuleService. Level workspace
// saja (scope='workspace') -- rule level project (PM) di luar cakupan
// Track S4W, sama batas Custom Status/Cooldown Mention/Webhook. Tab Log
// Eksekusi akan kosong sampai S4W-11 (execution engine, H17-19) benar-benar
// menulis baris -- bukan bug, sesuai urutan kickoff plan.
function AwRuleAutomationPageContent() {
  const { wsId } = useParams<{ wsId: string }>()
  const workspaceId = wsId ?? ''
  const { view, registerCta } = useOutletContext<WorkspaceOutletContext>()
  const tab: ViewTab = view === 'Template Library' || view === 'Log Eksekusi' ? view : 'Rule Aktif'

  const { data: workspace } = useWorkspace(workspaceId)
  const [addOpen, setAddOpen] = useState(false)
  const [templateForNew, setTemplateForNew] = useState<RuleTemplate | null>(null)
  const [logStatus, setLogStatus] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Rule | null>(null)

  const rules = useRules(workspaceId)
  const executions = useRuleExecutions(workspaceId, logStatus)
  const toggle = useToggleRuleActive(workspaceId)
  const remove = useDeleteRule(workspaceId)

  useEffect(() => {
    registerCta(() => {
      setTemplateForNew(null)
      setAddOpen(true)
    })
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(() => rules.data ?? [], [rules.data])

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.is_active).length
    const inactiveAuto = rows.filter((r) => !r.is_active && r.inactive_reason).length
    return { total: rows.length, active, inactiveAuto }
  }, [rows])

  const logRows = executions.data ?? []
  const failed7d = logRows.filter((l) => {
    const days = (Date.now() - new Date(l.executed_at).getTime()) / 86400000
    return l.status === 'failed' && days <= 7
  }).length

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex flex-wrap gap-3">
        <StatCard label="Total Rule" value={String(stats.total)} note="Level workspace" />
        <StatCard label="Active" value={String(stats.active)} note="Dieksekusi saat trigger" tone="mint" />
        <StatCard
          label="Inactive"
          value={String(stats.inactiveAuto)}
          note={stats.inactiveAuto ? 'Akibat status UNDEFINED' : 'Tidak ada'}
          tone={stats.inactiveAuto ? 'destructive' : undefined}
        />
        <StatCard label="Gagal 7 Hari" value={String(failed7d)} note="Perlu diperiksa" tone={failed7d > 0 ? 'amber' : undefined} />
      </div>

      {tab === 'Rule Aktif' && (
        <div className="border border-line">
          {rules.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
          {rows.length === 0 && !rules.isLoading && (
            <p className="p-6 text-center font-mono text-[10.5px] leading-relaxed text-text-muted">
              Belum ada rule di workspace ini.
              <br />
              Gunakan + Rule untuk membuka builder, atau pilih template siap pakai.
            </p>
          )}
          {rows.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              toggling={toggle.isPending}
              onToggle={() => toggle.mutate({ ruleId: rule.id, active: !rule.is_active })}
              onDelete={() => setConfirmDelete(rule)}
            />
          ))}
        </div>
      )}

      {tab === 'Template Library' && (
        <div className="border border-line">
          <div className="border-b border-line bg-raised-1 px-4 py-3 font-mono text-[9px] leading-relaxed text-text-dim">
            Template bawaan tidak dapat diedit langsung — aktifkan lalu sesuaikan parameternya.
          </div>
          {RULE_TEMPLATES.map((t) => (
            <TemplateRow
              key={t.key}
              template={t}
              onUse={() => {
                setTemplateForNew(t)
                setAddOpen(true)
              }}
            />
          ))}
        </div>
      )}

      {tab === 'Log Eksekusi' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={logStatus}
              onChange={(e) => setLogStatus(e.target.value)}
              className="border border-line-strong bg-input-bg px-2.5 py-2 font-mono text-[10px] text-text-bone outline-none"
            >
              <option value="">Semua status</option>
              <option value="completed">Berhasil</option>
              <option value="failed">Gagal</option>
            </select>
            <span className="ml-auto font-mono text-[9px] text-text-dim">{logRows.length} eksekusi</span>
          </div>
          <div className="border border-line">
            {executions.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
            {logRows.length === 0 && !executions.isLoading && (
              <p className="p-6 text-center font-mono text-[10.5px] text-text-muted">Tidak ada eksekusi pada filter ini.</p>
            )}
            {logRows.map((l) => (
              <ExecutionRow key={l.id} execution={l} />
            ))}
          </div>
          <p className="font-mono text-[8.5px] leading-relaxed text-text-dim">
            Entri log bersifat read-only dan bagian dari audit trail immutable — disimpan mengikuti retensi audit 3 tahun.
          </p>
        </>
      )}

      <AddRuleModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          setTemplateForNew(null)
        }}
        workspaceId={workspaceId}
        workspaceName={workspace?.name ?? ''}
        template={templateForNew}
      />

      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-6">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[560px] border border-destructive bg-panel">
            <div className="border-b border-line px-5 py-4">
              <div className="font-mono text-[9px] tracking-[0.16em] text-destructive">HAPUS RULE PERMANEN</div>
              <div className="mt-1.5 text-[15px] font-bold text-text-bone">{confirmDelete.name}</div>
            </div>
            <div className="flex flex-col gap-3.5 px-5 py-5">
              <div className="font-mono text-[10px] leading-relaxed text-text-muted">
                {confirmDelete.is_active ? 'Rule masih ACTIVE' : 'Rule sedang tidak aktif'} · {confirmDelete.runs} eksekusi tercatat.
              </div>
              <div className="font-mono text-[9.5px] leading-relaxed text-text-dim">
                Penghapusan bersifat permanen dan tidak dapat dibatalkan. Riwayat eksekusi yang sudah tercatat tetap tersimpan di Log Eksekusi
                sebagai audit immutable.
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate(confirmDelete.id, {
                      onSuccess: () => setConfirmDelete(null),
                    })
                  }
                  className="bg-destructive px-5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-white disabled:opacity-60"
                >
                  Hapus Permanen
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="border border-line-strong px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.04em] text-text-muted"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AwRuleAutomationPage() {
  return (
    <ErrorBoundary>
      <AwRuleAutomationPageContent />
    </ErrorBoundary>
  )
}
