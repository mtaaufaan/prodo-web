import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useOrganizationList } from '@/features/organizations/hooks'
import { useGroupPerformance } from '@/features/group-performance/hooks'
import type { OrgPerformance, TaskPriority } from '@/features/group-performance/types'
import { cn } from '@/lib/utils'

type Tab = 'Project Health' | 'Bottleneck & Flow'
type Mode = 'raw' | 'weighted'

const PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low']
const PRIORITY_TONE: Record<TaskPriority, string> = {
  critical: 'border-destructive text-destructive',
  high: 'border-amber text-amber',
  medium: 'border-blue text-blue',
  low: 'border-text-muted text-text-muted',
}
const RANGE_OPTIONS: { label: string; days: number }[] = [
  { label: '7 HARI', days: 7 },
  { label: '30 HARI', days: 30 },
  { label: 'SEMUA', days: 0 },
]

// bottleneckTag -- ambang sama dengan desain "GA Kinerja Grup.dc.html"
// (max avg days >=5.5 BOTTLENECK, >=4 WASPADA, selain itu SEHAT).
function bottleneckTag(avgDays: number): { label: string; tone: string } {
  if (avgDays >= 5.5) return { label: 'BOTTLENECK', tone: 'border-destructive text-destructive' }
  if (avgDays >= 4) return { label: 'WASPADA', tone: 'border-amber text-amber' }
  return { label: 'SEHAT', tone: 'border-mint text-mint' }
}

function OrgHealthRow({ org, mode }: { org: OrgPerformance; mode: Mode }) {
  const completion = mode === 'weighted' ? org.completion_rate_weighted : org.completion_rate_raw
  return (
    <div className="grid grid-cols-[minmax(160px,1.6fr)_minmax(130px,1.2fr)_minmax(190px,1.7fr)_120px] items-center gap-3 border-t border-line px-4 py-3.5">
      <div className="min-w-0">
        <div className="truncate text-[12.5px] text-text-bone">{org.organization_name}</div>
        <div className="font-mono text-[8.5px] text-text-dim">{org.workspace_count} workspace · {org.total_tasks} task</div>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="h-[5px] flex-1 bg-raised-2">
          <span className="block h-full bg-mint" style={{ width: `${Math.max(0, Math.min(100, completion))}%` }} />
        </span>
        <span className="w-9 text-right font-mono text-[10px] text-text-bone">{Math.round(completion)}%</span>
      </div>
      <div className="flex gap-1.5">
        {PRIORITIES.map((p) => {
          const rate = org.on_time_rate[p]
          return (
            <span
              key={p}
              title={`On-time rate ${p.toUpperCase()}${rate == null ? ' (belum ada task selesai berdue-date)' : ''}`}
              className={cn('flex-1 border px-1 py-1 text-center font-mono text-[9.5px]', rate == null ? 'border-line-strong text-text-dim' : PRIORITY_TONE[p])}
            >
              {rate == null ? '—' : `${Math.round(rate)}%`}
            </span>
          )
        })}
      </div>
      <div className="text-right">
        <div className={cn('font-mono text-[11px]', org.overdue_critical_count > 2 ? 'text-destructive' : 'text-amber')}>{org.overdue_count} task</div>
        <div className="mt-0.5 font-mono text-[8.5px] text-text-dim">{org.overdue_critical_count} CRITICAL</div>
      </div>
    </div>
  )
}

function OrgFlowCard({ org }: { org: OrgPerformance }) {
  const max = org.bottleneck[0]?.avg_days ?? 0
  const tag = bottleneckTag(max)
  return (
    <div className="border border-line-strong bg-panel p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="text-[13px] font-semibold text-text-bone">{org.organization_name}</span>
        <span className={cn('ml-auto border px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.06em]', tag.tone)}>{tag.label}</span>
      </div>
      <div className="flex flex-col gap-2">
        {org.bottleneck.map((b) => (
          <div key={b.status_name} className="flex items-center gap-2.5">
            <span className="w-[110px] truncate font-mono text-[9px] text-text-muted">{b.status_name}</span>
            <span className="h-[5px] flex-1 bg-raised-2">
              <span
                className={cn('block h-full', b.avg_days === max ? (max >= 5.5 ? 'bg-destructive' : 'bg-amber') : 'bg-mint')}
                style={{ width: `${max > 0 ? Math.round((b.avg_days / max) * 100) : 0}%` }}
              />
            </span>
            <span className="w-16 text-right font-mono text-[9.5px] text-text-bone">{b.avg_days.toFixed(1)} hari</span>
          </div>
        ))}
        {org.bottleneck.length === 0 && <p className="font-mono text-[9px] text-text-dim">Belum ada data sesi status.</p>}
      </div>
      {org.bottleneck.length > 0 && (
        <p className="mt-3 font-mono text-[8.5px] leading-relaxed text-text-dim">
          Status terlama: {org.bottleneck[0].status_name} — {org.bottleneck[0].avg_days.toFixed(1)} hari rata-rata hunian.
        </p>
      )}
    </div>
  )
}

// GroupPerformancePage (Track S4G, desain "GA Kinerja Grup.dc.html",
// US-079/S4G-25/26) -- forward-pull SETELAH Task Management Core (Phase
// 1-4) selesai, angka di sini REAL (dihitung dari tasks/task_status_sessions
// sungguhan), bukan stub kosong/nol seperti rencana awal S4G-25 (lihat
// implementation_gaps.md IG-46/50). Toggle RAW/WEIGHTED dan tab
// Project Health/Bottleneck & Flow murni client-side (satu response
// backend membawa kedua mode sekaligus) -- tidak ada refetch saat toggle.
function GroupPerformancePageContent() {
  const { groupId } = useOutletContext<GroupAdminOutletContext>()
  const [orgId, setOrgId] = useState('')
  const [rangeDays, setRangeDays] = useState(30)
  const [mode, setMode] = useState<Mode>('raw')
  const [tab, setTab] = useState<Tab>('Project Health')

  const orgList = useOrganizationList(groupId)
  const activeOrgs = useMemo(() => (orgList.data?.organizations ?? []).filter((o) => !o.deactivated_at), [orgList.data])
  const performance = useGroupPerformance(groupId, orgId, rangeDays)

  const summary = performance.data?.summary
  const orgs = performance.data?.organizations ?? []
  const completionRate = mode === 'weighted' ? summary?.completion_rate_weighted : summary?.completion_rate_raw

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex flex-wrap items-center gap-4 border border-line bg-panel px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">ORGANISASI</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setOrgId('')}
              className={cn('border px-2.5 py-1.5 font-mono text-[9.5px]', orgId === '' ? 'border-signal text-signal' : 'border-line-strong text-text-muted')}
            >
              SEMUA
            </button>
            {activeOrgs.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOrgId(o.id)}
                className={cn('border px-2.5 py-1.5 font-mono text-[9.5px]', orgId === o.id ? 'border-signal text-signal' : 'border-line-strong text-text-muted')}
              >
                {o.name.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">RENTANG</span>
          <div className="flex gap-1.5">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRangeDays(r.days)}
                className={cn('border px-2.5 py-1.5 font-mono text-[9.5px]', rangeDays === r.days ? 'border-signal text-signal' : 'border-line-strong text-text-muted')}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex">
          <button
            type="button"
            onClick={() => setMode('raw')}
            className={cn('px-3 py-1.5 font-mono text-[9.5px]', mode === 'raw' ? 'border border-signal text-signal' : 'border border-line-strong text-text-muted')}
          >
            RAW
          </button>
          <button
            type="button"
            onClick={() => setMode('weighted')}
            className={cn('border-l-0 px-3 py-1.5 font-mono text-[9.5px]', mode === 'weighted' ? 'border border-signal text-signal' : 'border border-line-strong text-text-muted')}
          >
            WEIGHTED
          </button>
        </div>
      </div>

      {performance.isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
      {performance.isError && <p className="text-sm text-destructive">Gagal memuat data kinerja grup.</p>}

      {summary && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[150px] flex-1 border border-line-strong bg-panel p-3.5">
              <div className="font-mono text-[9px] tracking-[0.12em] text-text-dim">COMPLETION RATE GRUP</div>
              <div className="mt-1 text-2xl font-extrabold text-mint">{Math.round(completionRate ?? 0)}%</div>
              <div className="mt-1 font-mono text-[9px] text-text-dim">{mode.toUpperCase()} · {orgs.length} ORGANISASI</div>
            </div>
            <div className="min-w-[150px] flex-1 border border-line-strong bg-panel p-3.5">
              <div className="font-mono text-[9px] tracking-[0.12em] text-text-dim">TASK DALAM RENTANG</div>
              <div className="mt-1 text-2xl font-extrabold text-text-bone">{summary.total_tasks}</div>
              <div className="mt-1 font-mono text-[9px] text-text-dim">{RANGE_OPTIONS.find((r) => r.days === rangeDays)?.label}</div>
            </div>
            <div className="min-w-[150px] flex-1 border border-line-strong bg-panel p-3.5">
              <div className="font-mono text-[9px] tracking-[0.12em] text-text-dim">OVERDUE</div>
              <div className={cn('mt-1 text-2xl font-extrabold', summary.overdue_critical_count > 6 ? 'text-destructive' : 'text-amber')}>{summary.overdue_count}</div>
              <div className="mt-1 font-mono text-[9px] text-text-dim">{summary.overdue_critical_count} CRITICAL</div>
            </div>
            <div className="min-w-[150px] flex-1 border border-line-strong bg-panel p-3.5">
              <div className="font-mono text-[9px] tracking-[0.12em] text-text-dim">BOTTLENECK TERATAS</div>
              <div className="mt-1 text-2xl font-extrabold text-amber">{summary.bottleneck_status_name ? `${summary.bottleneck_avg_days.toFixed(1)} HARI` : '—'}</div>
              <div className="mt-1 font-mono text-[9px] text-text-dim">
                {summary.bottleneck_status_name ? `${summary.bottleneck_status_name} · ${summary.bottleneck_org_name.toUpperCase()}` : '—'}
              </div>
            </div>
          </div>

          <div className="flex gap-1.5">
            {(['Project Health', 'Bottleneck & Flow'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'border px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em]',
                  tab === t ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted hover:text-text-bone',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Project Health' && (
            <div className="border border-line">
              <div className="grid grid-cols-[minmax(160px,1.6fr)_minmax(130px,1.2fr)_minmax(190px,1.7fr)_120px] gap-3 bg-raised-2 px-4 py-2.5 font-mono text-[9px] tracking-[0.1em] text-text-dim">
                <span>ORGANISASI</span>
                <span>COMPLETION · {mode.toUpperCase()}</span>
                <span>ON-TIME RATE PER PRIORITY</span>
                <span className="text-right">OVERDUE</span>
              </div>
              {orgs.map((o) => (
                <OrgHealthRow key={o.organization_id} org={o} mode={mode} />
              ))}
              {orgs.length === 0 && <p className="border-t border-line p-4 text-sm text-text-muted">Tidak ada organisasi dengan data pada filter ini.</p>}
              <div className="border-t border-line px-4 py-2.5 font-mono text-[8.5px] leading-relaxed text-text-dim">
                Agregat project-level saja. Group Admin tidak melihat Member Performance individual maupun konten task, komentar, dan attachment. Task tanpa due date dikecualikan dari On-Time Rate dan Overdue.
              </div>
            </div>
          )}

          {tab === 'Bottleneck & Flow' && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {orgs.map((o) => (
                <OrgFlowCard key={o.organization_id} org={o} />
              ))}
              {orgs.length === 0 && <p className="text-sm text-text-muted">Tidak ada organisasi dengan data pada filter ini.</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function GroupPerformancePage() {
  return (
    <ErrorBoundary>
      <GroupPerformancePageContent />
    </ErrorBoundary>
  )
}
