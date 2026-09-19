import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import { useMyContext } from '@/features/context/hooks'
import { useProjectPerformance, useWorkspacePerformance } from '@/features/performance/hooks'
import { formatHours, PRIORITY_ORDER, PRIORITY_WEIGHT, type PerformanceDashboard } from '@/features/performance/types'
import { useProjects } from '@/features/projects/hooks'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

type Tab = 'Project Health' | 'Member Performance' | 'Flow Efficiency'
type Mode = 'raw' | 'weighted'
type BottleMode = 'total' | 'queue'

const PRIORITY_LABEL: Record<string, string> = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' }
const PRIORITY_CLASS: Record<string, string> = {
  critical: 'text-destructive border-destructive',
  high: 'text-amber border-amber',
  medium: 'text-signal border-signal',
  low: 'text-text-dim border-line-strong',
}

// PerformanceDashboardPage (EPIC 12 Reporting & Analytics, US-075/076/077/
// 078, desain "Performance Dashboard.dc.html"). SATU halaman dipakai DUA
// mode: Admin Workspace (lintas project workspace, filter "SEMUA PROJECT"
// atau satu project) dan Project Manager (project miliknya sendiri saja,
// dipilih dari daftar project di mana dia PM) -- persis pola desain
// (komponen sama, prop `role` beda). Role lain (Editor/Approver/Viewer)
// mendapat layar "AKSES DITOLAK" sama seperti desain. Group Admin punya
// dashboard TERPISAH (GA Kinerja Grup, US-079) -- tidak lewat halaman ini.
export default function PerformanceDashboardPage() {
  const { wsId } = useParams<{ wsId: string }>()
  const workspaceId = wsId ?? ''
  const { view } = useOutletContext<WorkspaceOutletContext>()
  const tab: Tab = view === 'Member Performance' || view === 'Flow Efficiency' ? view : 'Project Health'

  const currentUserId = useAuthStore((s) => s.user?.id)
  const myContext = useMyContext()
  const platformRole = myContext.data?.platform_role
  const myWorkspaceRole = (myContext.data?.workspace_memberships ?? []).find((w) => w.workspace_id === workspaceId)?.role
  const isFullMode = platformRole === 'platform_admin' || platformRole === 'group_admin' || myWorkspaceRole === 'admin_workspace'

  const projects = useProjects(workspaceId)
  const myProjects = useMemo(
    () => (projects.data ?? []).filter((p) => p.pm_user_id === currentUserId && !p.is_archived),
    [projects.data, currentUserId],
  )
  const isPM = !isFullMode && myProjects.length > 0

  const [projectFilter, setProjectFilter] = useState('')
  const [activeProjectId, setActiveProjectId] = useState('')
  const [range, setRange] = useState(30)
  const [mode, setMode] = useState<Mode>('raw')
  const [bottleMode, setBottleMode] = useState<BottleMode>('total')

  useEffect(() => {
    if (isPM && !activeProjectId && myProjects.length > 0) setActiveProjectId(myProjects[0].id)
  }, [isPM, myProjects, activeProjectId])

  const wsQuery = useWorkspacePerformance(workspaceId, projectFilter, range, isFullMode)
  const pmQuery = useProjectPerformance(activeProjectId, range, isPM)
  const data = isFullMode ? wsQuery.data : pmQuery.data
  const isLoadingData = isFullMode ? wsQuery.isLoading : pmQuery.isLoading

  const contextLoading = myContext.isLoading || projects.isLoading
  const denied = !contextLoading && !isFullMode && !isPM

  const activeProjects = (projects.data ?? []).filter((p) => !p.is_archived)
  const scopeLabel = isFullMode
    ? 'WORKSPACE' + (projectFilter ? ' · ' + (activeProjects.find((p) => p.id === projectFilter)?.name ?? '') : ' · SEMUA PROJECT')
    : 'PROJECT · ' + (myProjects.find((p) => p.id === activeProjectId)?.name ?? '-')

  if (contextLoading) {
    return <div className="p-6 text-sm text-text-muted">Memuat...</div>
  }
  if (denied) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <div className="max-w-md text-center">
          <div className="mb-2.5 font-mono text-[10px] tracking-[0.16em] text-amber">AKSES DITOLAK · 403</div>
          <div className="mb-2 text-[16px] font-bold text-text-bone">Performance Dashboard tidak tersedia untuk role ini</div>
          <div className="font-mono text-[10px] leading-relaxed text-text-dim">
            Hanya Project Manager (project sendiri), Admin Workspace (lintas project di workspace), dan Group Admin (agregat lintas organisasi)
            yang memiliki akses.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
        <div>
          <div className="font-mono text-[9px] tracking-[0.18em] text-text-dim">PERFORMANCE DASHBOARD · {scopeLabel}</div>
          <div className="mt-1.5 text-[15px] font-bold text-text-bone">{tab}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.1em] text-mint">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" /> REALTIME · READ-ONLY
          </div>
          <div className="flex">
            <button
              type="button"
              onClick={() => setMode('raw')}
              className={cn('border px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.06em]', mode === 'raw' ? 'border-signal text-signal' : 'border-line-strong text-text-dim')}
            >
              RAW
            </button>
            <button
              type="button"
              onClick={() => setMode('weighted')}
              className={cn('border border-l-0 px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.06em]', mode === 'weighted' ? 'border-signal text-signal' : 'border-line-strong text-text-dim')}
            >
              WEIGHTED
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b border-line-subtle bg-raised-1 px-1 py-2.5">
        {isFullMode ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">PROJECT</span>
            <button
              type="button"
              onClick={() => setProjectFilter('')}
              className={cn('border px-2 py-1 font-mono text-[9.5px]', projectFilter === '' ? 'border-signal text-signal' : 'border-line-strong text-text-dim')}
            >
              SEMUA PROJECT
            </button>
            {activeProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProjectFilter(p.id)}
                className={cn('max-w-[180px] truncate border px-2 py-1 font-mono text-[9.5px]', projectFilter === p.id ? 'border-signal text-signal' : 'border-line-strong text-text-dim')}
              >
                {p.name.toUpperCase()}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">PROJECT</span>
            {myProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveProjectId(p.id)}
                className={cn('max-w-[180px] truncate border px-2 py-1 font-mono text-[9.5px]', activeProjectId === p.id ? 'border-signal text-signal' : 'border-line-strong text-text-dim')}
              >
                {p.name.toUpperCase()}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">RENTANG</span>
          {[
            { label: '7 HARI', value: 7 },
            { label: '30 HARI', value: 30 },
            { label: 'SEMUA', value: 0 },
          ].map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={cn('border px-2 py-1 font-mono text-[9.5px]', range === r.value ? 'border-signal text-signal' : 'border-line-strong text-text-dim')}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">BOBOT PRIORITY</span>
          {PRIORITY_ORDER.map((p) => (
            <span key={p} className={cn('flex items-center gap-1.5 border border-line-strong px-1.5 py-1 font-mono text-[9px]', PRIORITY_CLASS[p].split(' ')[0])}>
              {PRIORITY_LABEL[p]} <span className="text-text-dim">×{PRIORITY_WEIGHT[p]}</span>
            </span>
          ))}
        </div>
        {data && <div className="ml-auto font-mono text-[9px] text-text-dim">{data.scope_total} task dalam rentang · {data.scope_done} selesai</div>}
      </div>

      {isLoadingData && <p className="text-sm text-text-muted">Memuat data kinerja...</p>}
      {!isLoadingData && !data && <p className="font-mono text-[10.5px] text-text-muted">Pilih project untuk melihat kinerja.</p>}
      {!isLoadingData && data && tab === 'Project Health' && <ProjectHealthTab data={data} mode={mode} />}
      {!isLoadingData && data && tab === 'Member Performance' && <MemberPerformanceTab data={data} mode={mode} />}
      {!isLoadingData && data && tab === 'Flow Efficiency' && <FlowEfficiencyTab data={data} bottleMode={bottleMode} setBottleMode={setBottleMode} />}
    </div>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('border border-line bg-panel p-4', className)}>{children}</div>
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[8.5px] tracking-[0.16em] text-text-dim">{children}</div>
}

function ProjectHealthTab({ data, mode }: { data: PerformanceDashboard; mode: Mode }) {
  const rate = mode === 'weighted' ? data.completion_rate_weighted : data.completion_rate_raw

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        <Card>
          <CardLabel>COMPLETION RATE · {mode.toUpperCase()}</CardLabel>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span className="text-[32px] font-extrabold text-text-bone">{rate.toFixed(0)}%</span>
          </div>
          <div className="mt-3 h-1.5 bg-raised-1">
            <div className="h-full bg-mint" style={{ width: `${rate}%` }} />
          </div>
          <div className="mt-2.5 font-mono text-[9px] leading-relaxed text-text-dim">
            {mode === 'weighted'
              ? 'Weighted memakai bobot priority global. Task tanpa priority dikecualikan.'
              : `Raw menghitung jumlah task apa adanya. Varian weighted: ${data.completion_rate_weighted.toFixed(0)}%.`}
          </div>
        </Card>

        <Card>
          <CardLabel>ON-TIME RATE · PER PRIORITY</CardLabel>
          <div className="mt-3 flex flex-col gap-2">
            {data.on_time.map((o) => (
              <div key={o.priority} className="flex items-center gap-2.5">
                <span className={cn('w-14 font-mono text-[9px]', PRIORITY_CLASS[o.priority]?.split(' ')[0])}>{PRIORITY_LABEL[o.priority] ?? o.priority}</span>
                <span className="h-1.5 flex-1 bg-raised-1">
                  <span className={cn('block h-full', PRIORITY_CLASS[o.priority]?.includes('destructive') ? 'bg-destructive' : 'bg-signal')} style={{ width: `${o.rate_pct ?? 0}%` }} />
                </span>
                <span className="w-16 text-right font-mono text-[9.5px] text-text-bone">{o.rate_pct == null ? '—' : `${o.rate_pct.toFixed(0)}% · ${o.on_time}/${o.done_with_due}`}</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 font-mono text-[9px] text-text-dim">{data.no_due_count} task tanpa due date dikecualikan dari On-Time Rate dan Overdue.</div>
        </Card>

        <Card>
          <CardLabel>BACKLOG HEALTH · "BELUM LENGKAP"</CardLabel>
          <div className="mt-3 flex flex-col gap-2">
            {data.backlog_health.map((b) => (
              <div key={b.priority} className="flex items-center justify-between border-b border-line-subtle pb-1.5">
                <span className={cn('font-mono text-[9.5px]', PRIORITY_CLASS[b.priority]?.split(' ')[0])}>{PRIORITY_LABEL[b.priority] ?? b.priority}</span>
                <span className="font-mono text-[13px] font-semibold text-text-bone">{b.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 font-mono text-[9px] leading-relaxed text-text-dim">Task BACKLOG bertanda Belum Lengkap tertahan -- tidak dapat berpindah status sampai dilengkapi.</div>
        </Card>
      </div>

      <Card>
        <CardLabel>CYCLE TIME · RATA-RATA ACTIVE TIME PER STATUS</CardLabel>
        <div className="mt-3.5 overflow-x-auto">
          <table className="w-full min-w-[500px] text-left">
            <thead>
              <tr className="font-mono text-[8.5px] tracking-[0.1em] text-text-dim">
                <th className="pb-2">STATUS</th>
                {PRIORITY_ORDER.map((p) => (
                  <th key={p} className={cn('pb-2 text-right', PRIORITY_CLASS[p]?.split(' ')[0])}>{PRIORITY_LABEL[p]}</th>
                ))}
                <th className="pb-2 text-right">RATA-RATA</th>
              </tr>
            </thead>
            <tbody>
              {data.cycle.map((c) => (
                <tr key={c.status_name} className="border-t border-line-subtle">
                  <td className="py-2 font-mono text-[10px] text-text-bone">{c.status_name}</td>
                  {PRIORITY_ORDER.map((p) => (
                    <td key={p} className="py-2 text-right font-mono text-[10px] text-text-muted">{c.avg_by_priority[p] != null ? formatHours(c.avg_by_priority[p]) : '—'}</td>
                  ))}
                  <td className={cn('py-2 text-right font-mono text-[10.5px] font-semibold', c.avg_hours >= 120 ? 'text-destructive' : c.avg_hours >= 84 ? 'text-amber' : 'text-mint')}>
                    {formatHours(c.avg_hours)}
                  </td>
                </tr>
              ))}
              {data.cycle.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center font-mono text-[9.5px] text-text-dim">Belum ada data cycle time pada rentang ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line-subtle px-4 py-3">
          <span className="font-mono text-[8.5px] tracking-[0.16em] text-text-dim">OVERDUE TASK</span>
          <span className="font-mono text-[9.5px] text-destructive">{data.overdue_total} task lewat due date · {data.overdue_critical} CRITICAL</span>
        </div>
        {data.overdue.map((t, i) => (
          <div key={i} className={cn('grid grid-cols-[80px_1fr_90px_100px_80px] items-center gap-2.5 border-b border-line-subtle px-4 py-2.5', t.priority === 'critical' && 'bg-destructive/10')}>
            <span className="font-mono text-[9.5px] text-signal">{t.task_code ?? '—'}</span>
            <span className="truncate text-[12px] text-text-bone">{t.title}</span>
            <span className={cn('border px-1.5 py-0.5 text-center font-mono text-[8.5px] tracking-[0.06em]', PRIORITY_CLASS[t.priority])}>{PRIORITY_LABEL[t.priority] ?? t.priority}</span>
            <span className="font-mono text-[9.5px] text-text-dim">DUE {new Date(t.due_date).toLocaleDateString('id-ID')}</span>
            <span className={cn('text-right font-mono text-[9.5px]', t.priority === 'critical' ? 'text-destructive' : 'text-amber')}>{t.days_late} HARI</span>
          </div>
        ))}
        {data.overdue.length === 0 && <div className="p-6 text-center font-mono text-[10px] text-text-dim">Tidak ada task melewati due date pada rentang ini.</div>}
      </div>
    </div>
  )
}

function MemberPerformanceTab({ data, mode }: { data: PerformanceDashboard; mode: Mode }) {
  return (
    <div className="space-y-3.5">
      <div className="overflow-x-auto border border-line bg-panel">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-line-subtle font-mono text-[8.5px] tracking-[0.1em] text-text-dim">
              <th className="px-4 py-2.5">MEMBER</th>
              <th className="px-4 py-2.5">TASK LOAD · PER PRIORITY</th>
              <th className="px-4 py-2.5">COMPLETION · {mode.toUpperCase()}</th>
              <th className="px-4 py-2.5 text-right">AVG SELESAI</th>
              <th className="px-4 py-2.5 text-right">ACK RATE</th>
            </tr>
          </thead>
          <tbody>
            {data.members.map((m) => {
              const rate = mode === 'weighted' ? m.completion_rate_weighted : m.completion_rate_raw
              const ack = m.ack_avg_hours
              return (
                <tr key={m.user_id} className="border-b border-line-subtle">
                  <td className="px-4 py-3">
                    <div className="text-[12.5px] text-text-bone">{m.user_name}</div>
                    <div className="font-mono text-[8.5px] text-text-dim">{m.total_count - m.done_count} task aktif · {m.done_count}/{m.total_count} selesai</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {PRIORITY_ORDER.map((p) => (
                        <span key={p} className={cn('flex-1 border px-1 py-1 text-center font-mono text-[9px]', PRIORITY_CLASS[p])}>{m.active_by_priority[p] ?? 0}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-1.5 flex-1 bg-raised-1"><span className="block h-full bg-mint" style={{ width: `${rate}%` }} /></span>
                      <span className="w-12 text-right font-mono text-[9.5px] text-text-bone">{rate.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[9.5px] text-text-muted">{m.avg_completion_hours != null ? formatHours(m.avg_completion_hours) : '—'}</td>
                  <td className={cn('px-4 py-3 text-right font-mono text-[9.5px]', ack == null ? 'text-text-dim' : ack > 24 ? 'text-destructive' : ack > 12 ? 'text-amber' : 'text-mint')}>
                    {ack != null ? formatHours(ack) : m.ack_pending_count > 0 ? `${m.ack_pending_count} pending` : '—'}
                  </td>
                </tr>
              )
            })}
            {data.members.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center font-mono text-[10px] text-text-dim">Belum ada member dengan task pada rentang ini.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="font-mono text-[9px] leading-relaxed text-text-dim">
        Acknowledge Rate = rata-rata jeda antara PIC handoff dikirim dan member melakukan acknowledge (US-017). Data Member Performance tidak tersedia untuk Group Admin.
      </div>
    </div>
  )
}

function FlowEfficiencyTab({ data, bottleMode, setBottleMode }: { data: PerformanceDashboard; bottleMode: BottleMode; setBottleMode: (m: BottleMode) => void }) {
  const flowPct = data.flow_efficiency_pct
  const flowColor = flowPct == null ? 'text-text-dim' : flowPct >= 40 ? 'text-mint' : flowPct >= 20 ? 'text-amber' : 'text-destructive'
  const regressedNote = `${data.regressed_tasks} dari ${data.scope_total} task pernah mundur status`

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Card>
          <CardLabel>FLOW EFFICIENCY</CardLabel>
          <div className={cn('mt-2.5 font-mono text-[20px] font-semibold', flowColor)}>{flowPct == null ? '—' : `${flowPct.toFixed(0)}%`}</div>
          <div className="mt-2 font-mono text-[8.5px] leading-relaxed text-text-dim">Σ Active Time ÷ Lead Time · task selesai pada scope ini</div>
        </Card>
        <Card>
          <CardLabel>LEAD TIME</CardLabel>
          <div className="mt-2.5 font-mono text-[20px] font-semibold text-text-bone">{formatHours(data.lead_time_hours)}</div>
          <div className="mt-2 font-mono text-[8.5px] leading-relaxed text-text-dim">created_at → status_entered_at(Done), akumulasi</div>
        </Card>
        <Card>
          <CardLabel>CYCLE TIME</CardLabel>
          <div className="mt-2.5 font-mono text-[20px] font-semibold text-signal">{data.cycle_time_avg_hours != null ? formatHours(data.cycle_time_avg_hours) : '—'}</div>
          <div className="mt-2 font-mono text-[8.5px] leading-relaxed text-text-dim">work_started_at pertama → Done, rata-rata project</div>
        </Card>
        <Card>
          <CardLabel>REGRESSION RATE</CardLabel>
          <div className={cn('mt-2.5 font-mono text-[20px] font-semibold', data.regressed_tasks > 0 ? 'text-destructive' : 'text-text-dim')}>{data.regression_rate_pct.toFixed(0)}%</div>
          <div className="mt-2 font-mono text-[8.5px] leading-relaxed text-text-dim">{regressedNote}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CardLabel>BOTTLENECK DETECTION</CardLabel>
            <div className="ml-auto flex gap-1.5">
              {(['total', 'queue'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBottleMode(m)}
                  className={cn('border px-2 py-1 font-mono text-[8.5px] tracking-[0.06em]', bottleMode === m ? 'border-signal bg-signal/15 text-signal' : 'border-line-strong text-text-dim')}
                >
                  {m === 'total' ? 'TOTAL' : 'QUEUE TIME'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {data.bottleneck.map((b, i) => {
              const v = bottleMode === 'queue' ? b.avg_queue_hours : b.avg_total_hours
              const worst = data.bottleneck.length > 0 ? Math.max(...data.bottleneck.map((x) => (bottleMode === 'queue' ? x.avg_queue_hours : x.avg_total_hours))) || 1 : 1
              const tag = i === 0 ? 'BOTTLENECK' : v >= worst * 0.6 ? 'WASPADA' : 'SEHAT'
              const tagColor = i === 0 ? 'text-destructive border-destructive' : v >= worst * 0.6 ? 'text-amber border-amber' : 'text-mint border-mint'
              return (
                <div key={b.status_name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="flex items-center gap-2 font-mono text-[10px] text-text-bone">
                      {b.status_name} <span className={cn('border px-1 py-0.5 text-[8.5px] tracking-[0.08em]', tagColor)}>{tag}</span>
                    </span>
                    <span className={cn('font-mono text-[10.5px] font-semibold', tagColor.split(' ')[0])}>{formatHours(v)}</span>
                  </div>
                  <span className="h-1.5 bg-raised-1"><span className={cn('block h-full', tagColor.includes('destructive') ? 'bg-destructive' : tagColor.includes('amber') ? 'bg-amber' : 'bg-mint')} style={{ width: `${Math.min(100, (v / worst) * 100)}%` }} /></span>
                  <span className="font-mono text-[8.5px] text-text-dim">
                    {bottleMode === 'queue'
                      ? `Queue Time rata-rata ${formatHours(b.avg_queue_hours)} -- menunggu sebelum dikerjakan · Active ${formatHours(b.avg_active_hours)}`
                      : `Queue ${formatHours(b.avg_queue_hours)} + Active ${formatHours(b.avg_active_hours)} · ${b.session_count} sesi tercatat`}
                  </span>
                </div>
              )
            })}
            {data.bottleneck.length === 0 && <p className="font-mono text-[9.5px] text-text-dim">Belum ada sesi status pada rentang ini.</p>}
          </div>
        </Card>

        <Card>
          <CardLabel>HANDOFF DELAY · STATUS CHANGE → SELURUH PIC ACK</CardLabel>
          <div className="mt-3.5 flex flex-col gap-2.5">
            {data.handoff_delay.map((h) => {
              const hours = h.avg_hours ?? 0
              const color = h.avg_hours == null ? 'text-text-dim' : hours > 24 ? 'text-destructive' : hours > 12 ? 'text-amber' : 'text-mint'
              return (
                <div key={h.project_id} className="flex items-center gap-3 border-b border-line-subtle pb-2">
                  <span className="flex-1 truncate text-[12px] text-text-bone">{h.project_name}</span>
                  <span className="h-1.5 w-24 bg-raised-1">
                    <span className={cn('block h-full', color.includes('destructive') ? 'bg-destructive' : color.includes('amber') ? 'bg-amber' : 'bg-mint')} style={{ width: `${Math.min(100, (hours / 40) * 100)}%` }} />
                  </span>
                  <span className={cn('w-16 text-right font-mono text-[10px]', color)}>{h.avg_hours != null ? formatHours(h.avg_hours) : '—'}</span>
                  <span className="w-24 text-right font-mono text-[8.5px] text-text-dim">{h.pending_count} PIC pending</span>
                </div>
              )
            })}
            {data.handoff_delay.length === 0 && <p className="font-mono text-[9.5px] text-text-dim">Belum ada PIC handoff pada rentang ini.</p>}
          </div>
        </Card>

        <Card>
          <CardLabel>REGRESSION RATE · PER STATUS ASAL</CardLabel>
          <div className="mt-3.5 flex flex-col gap-3">
            {data.regression_by_status.map((r) => {
              const color = r.rate_pct >= 30 ? 'text-destructive' : r.rate_pct >= 10 ? 'text-amber' : 'text-mint'
              return (
                <div key={r.status_name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="font-mono text-[10px] text-text-bone">{r.status_name}</span>
                    <span className={cn('font-mono text-[10.5px] font-semibold', color)}>{r.rate_pct.toFixed(0)}%</span>
                  </div>
                  <span className="h-1.5 bg-raised-1"><span className={cn('block h-full', color.includes('destructive') ? 'bg-destructive' : color.includes('amber') ? 'bg-amber' : 'bg-mint')} style={{ width: `${Math.min(100, r.rate_pct)}%` }} /></span>
                  <span className="font-mono text-[8.5px] leading-relaxed text-text-dim">{r.regressions} sesi masuk lewat regresi dari {r.sessions} sesi · {r.tasks_through} task melewati status ini</span>
                </div>
              )
            })}
            {data.regression_by_status.every((r) => r.regressions === 0) && (
              <p className="font-mono text-[9px] leading-relaxed text-text-dim">Belum ada regresi tercatat pada periode ini -- definition of done tiap status terpenuhi sejak submission pertama.</p>
            )}
          </div>
          <div className="mt-3 font-mono text-[8.5px] leading-relaxed text-text-dim">Status yang sering menerima regresi mengindikasikan definition of done yang kurang jelas. Sumber data: Status Time Tracking di audit trail task.</div>
        </Card>
      </div>
    </div>
  )
}
