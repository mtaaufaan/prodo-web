import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import AllocationModal from '@/components/storage/AllocationModal'
import { useOrganizationList } from '@/features/organizations/hooks'
import { useWorkspaceListByGroup } from '@/features/workspaces/hooks'
import type { WorkspaceListRow } from '@/features/workspaces/types'
import { cn, logoBgClass } from '@/lib/utils'

const GB = 1024 * 1024 * 1024

type ViewTab = 'Ringkasan' | 'Per-Organisasi'

function level(pct: number): { label: string; tone: 'mint' | 'amber' | 'destructive' } {
  if (pct >= 100) return { label: 'DIBLOKIR', tone: 'destructive' }
  if (pct >= 95) return { label: 'KRITIS', tone: 'destructive' }
  if (pct >= 80) return { label: 'PERINGATAN', tone: 'amber' }
  return { label: 'NORMAL', tone: 'mint' }
}

const toneClass = { mint: 'text-mint border-mint', amber: 'text-amber border-amber', destructive: 'text-destructive border-destructive' } as const

// S4G-09, Track S4G (desain "GA Storage Quota.dc.html") -- tab Ringkasan/
// Per-Organisasi DI DALAM halaman ini sendiri (view-mode toggle), BUKAN
// baris tab shell (Semua/Aktif/Arsip/Nonaktif itu konsep filter status,
// beda dari sini). Seluruh data ringkasan (plafon/teralokasi/terpakai,
// alert 80%+, top-workspace) dihitung DI SINI dari GET /organizations?
// group_id= (S4G-03) + GET /workspaces?group_id= (S4G-05) yang sudah ada
// -- TIDAK ADA endpoint GET /groups/:id/storage-summary terpisah, lihat
// catatan S4G-07 (tidak ada informasi baru yang butuh endpoint sendiri).
// storage_used_bytes per-workspace SELALU 0 untuk sekarang
// (implementation_gaps.md IG-19) -- top-5 workspace otomatis kosong
// sampai fitur upload attachment sungguhan ada, bukan bug.
function GroupStorageQuotaPageContent() {
  const outletContext = useOutletContext<GroupAdminOutletContext>()
  const isBareRender = !outletContext
  const { registerCta, groupId } = outletContext ?? { registerCta: () => {}, groupId: undefined }
  const [tab, setTab] = useState<ViewTab>('Ringkasan')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [allocOpen, setAllocOpen] = useState(false)

  const orgList = useOrganizationList(isBareRender ? undefined : groupId)
  const wsList = useWorkspaceListByGroup(isBareRender ? undefined : groupId)

  useEffect(() => {
    registerCta(() => setAllocOpen(true))
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const orgs = useMemo(() => orgList.data?.organizations ?? [], [orgList.data])
  const capBytes = orgList.data?.group_storage_ceiling_bytes ?? 0
  const workspaces = useMemo(() => wsList.data ?? [], [wsList.data])

  const allocatedBytes = useMemo(() => orgs.reduce((s, o) => s + o.storage_quota_bytes, 0), [orgs])
  const usedBytes = useMemo(() => orgs.reduce((s, o) => s + o.storage_used_bytes, 0), [orgs])
  const freeBytes = Math.max(0, capBytes - allocatedBytes)

  const alerts = useMemo(
    () =>
      orgs
        .map((o) => ({ org: o, pct: o.storage_quota_bytes > 0 ? Math.round((o.storage_used_bytes / o.storage_quota_bytes) * 100) : 0 }))
        .filter((a) => a.pct >= 80)
        .sort((a, b) => b.pct - a.pct),
    [orgs],
  )

  const topWorkspaces = useMemo(
    () =>
      workspaces
        .filter((w) => w.storage_used_bytes > 0)
        .sort((a, b) => b.storage_used_bytes - a.storage_used_bytes)
        .slice(0, 5),
    [workspaces],
  )
  const maxTopUsage = Math.max(1, ...topWorkspaces.map((w) => w.storage_used_bytes))

  const workspacesByOrg = useMemo(() => {
    const map = new Map<string, WorkspaceListRow[]>()
    workspaces.forEach((w) => {
      const list = map.get(w.org_id) ?? []
      list.push(w)
      map.set(w.org_id, list)
    })
    return map
  }, [workspaces])

  const isLoading = orgList.isLoading || wsList.isLoading

  return (
    <>
      <div className="space-y-3.5 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {(['Ringkasan', 'Per-Organisasi'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em]',
                  tab === t ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted',
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {isBareRender && (
            <button
              type="button"
              onClick={() => setAllocOpen(true)}
              className="bg-signal px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-bg-deep"
            >
              Atur Kuota
            </button>
          )}
        </div>

        {isLoading && <p className="text-sm text-text-muted">Memuat...</p>}

        {!isLoading && tab === 'Ringkasan' && (
          <div className="space-y-4">
            <div className="border border-line bg-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Plafon Grup</div>
                  <div className="mt-1.5 text-[15px] font-bold text-text-body">{(capBytes / GB).toFixed(0)} GB ditetapkan Platform Admin</div>
                </div>
                <div className="flex gap-6">
                  <div>
                    <div className="font-mono text-[9px] text-text-dim">TERPAKAI</div>
                    <div className="mt-1 text-xl font-extrabold text-text-body">{(usedBytes / GB).toFixed(1)} GB</div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] text-text-dim">TERALOKASI</div>
                    <div className="mt-1 text-xl font-extrabold text-signal">{(allocatedBytes / GB).toFixed(1)} GB</div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] text-text-dim">BELUM DIALOKASIKAN</div>
                    <div className="mt-1 text-xl font-extrabold text-mint">{(freeBytes / GB).toFixed(1)} GB</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex h-3 bg-line-subtle">
                <div className="h-full bg-text-body" style={{ width: `${capBytes > 0 ? Math.min(100, (usedBytes / capBytes) * 100) : 0}%` }} />
                <div
                  className="h-full bg-signal"
                  style={{ width: `${capBytes > 0 ? Math.max(0, Math.min(100, ((allocatedBytes - usedBytes) / capBytes) * 100)) : 0}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-4 font-mono text-[9px] text-text-dim">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-text-body" />TERPAKAI</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-signal" />TERALOKASI BELUM TERPAKAI</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-line-subtle" />SISA PLAFON</span>
              </div>
            </div>

            <div className="border border-line">
              <div className="flex items-center justify-between border-b border-line bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                <span>Peringatan Kuota Aktif</span>
                <span className="text-text-dim">Ambang 80% peringatan · 95% kritis · 100% upload diblokir</span>
              </div>
              {alerts.length === 0 && (
                <p className="p-6 text-center font-mono text-[10.5px] text-text-muted">Tidak ada organisasi yang melewati ambang 80%.</p>
              )}
              {alerts.map((a) => {
                const lv = level(a.pct)
                return (
                  <div key={a.org.id} className="flex items-center gap-3.5 border-t border-line px-4 py-3">
                    <span className={cn('border px-2 py-0.5 font-mono text-[9.5px] font-semibold', toneClass[lv.tone])}>{lv.label}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] text-text-body">
                        {a.org.name} — {a.pct}% dari {(a.org.storage_quota_bytes / GB).toFixed(0)} GB
                      </div>
                      <div className="mt-0.5 font-mono text-[9px] text-text-muted">
                        Sisa {Math.max(0, (a.org.storage_quota_bytes - a.org.storage_used_bytes) / GB).toFixed(1)} GB
                      </div>
                    </div>
                    <button type="button" onClick={() => setAllocOpen(true)} className="whitespace-nowrap font-mono text-[9.5px] text-text-muted hover:text-signal">
                      TAMBAH KUOTA →
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="border border-line">
              <div className="border-b border-line bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                Workspace Paling Banyak Menggunakan Storage
              </div>
              {topWorkspaces.length === 0 && (
                <p className="p-6 text-center font-mono text-[10.5px] text-text-muted">
                  Belum ada data pemakaian storage per-workspace.
                </p>
              )}
              {topWorkspaces.map((w) => (
                <div key={w.id} className="grid grid-cols-[1.5fr_1.2fr_2fr_0.6fr] items-center gap-3.5 border-t border-line px-4 py-2.5">
                  <span className="truncate text-[12.5px] text-text-body">{w.name}</span>
                  <span className="truncate font-mono text-[9.5px] text-text-muted">{w.org_name}</span>
                  <span className="h-1.5 bg-line-subtle">
                    <span className="block h-full bg-signal" style={{ width: `${(w.storage_used_bytes / maxTopUsage) * 100}%` }} />
                  </span>
                  <span className="text-right font-mono text-[10.5px] text-text-body">{(w.storage_used_bytes / GB).toFixed(1)} GB</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && tab === 'Per-Organisasi' && (
          <div className="border border-line">
            <div className="grid grid-cols-[1.9fr_1.2fr_0.8fr_0.8fr_0.9fr_0.8fr] gap-3 border-b border-line bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
              <span>Organisasi</span>
              <span>Pemakaian</span>
              <span>Alokasi</span>
              <span>Maks</span>
              <span>Ambang</span>
              <span>Aksi</span>
            </div>
            {orgs.map((o) => {
              const pct = o.storage_quota_bytes > 0 ? Math.round((o.storage_used_bytes / o.storage_quota_bytes) * 100) : 0
              const lv = level(pct)
              const orgWorkspaces = workspacesByOrg.get(o.id) ?? []
              const isExpanded = !!expanded[o.id]
              const maxWsUsage = Math.max(1, ...orgWorkspaces.map((w) => w.storage_used_bytes))
              return (
                <div key={o.id} className="border-t border-line">
                  <div className="grid grid-cols-[1.9fr_1.2fr_0.8fr_0.8fr_0.9fr_0.8fr] items-center gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={cn('flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center text-[12px] font-extrabold text-bg-deep', logoBgClass(o.id))}>
                        {o.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] text-text-body">{o.name}</div>
                        <div className="font-mono text-[9px] text-text-muted">{o.workspace_count} WS</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono text-[9px] text-text-muted">
                        <span>{(o.storage_used_bytes / GB).toFixed(1)} / {(o.storage_quota_bytes / GB).toFixed(1)} GB</span>
                        <span className={toneClass[lv.tone].split(' ')[0]}>{pct}%</span>
                      </div>
                      <span className="h-1.5 bg-line-subtle">
                        <span className={cn('block h-full', lv.tone === 'destructive' ? 'bg-destructive' : lv.tone === 'amber' ? 'bg-amber' : 'bg-mint')} style={{ width: `${Math.min(100, pct)}%` }} />
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-text-body">{(o.storage_quota_bytes / GB).toFixed(0)} GB</span>
                    <span className="font-mono text-[10.5px] text-text-muted">{(o.storage_max_bytes / GB).toFixed(0)} GB</span>
                    <span className={cn('font-mono text-[9px] font-semibold', toneClass[lv.tone].split(' ')[0])}>● {lv.label}</span>
                    <div className="flex flex-col items-start gap-1">
                      <button type="button" onClick={() => setAllocOpen(true)} className="font-mono text-[10px] text-text-muted hover:text-signal">
                        ✎ Atur
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpanded((e) => ({ ...e, [o.id]: !e[o.id] }))}
                        className="font-mono text-[9px] text-text-muted hover:text-signal"
                      >
                        {isExpanded ? '▴ WS' : '▾ WS'}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="flex flex-col gap-2 px-4 pb-4 pl-[53px]">
                      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">Breakdown per Workspace</div>
                      {orgWorkspaces.length === 0 && (
                        <p className="font-mono text-[9.5px] text-text-muted">Belum ada workspace pada organisasi ini.</p>
                      )}
                      {orgWorkspaces.map((w) => (
                        <div key={w.id} className="grid grid-cols-[1.4fr_2.4fr_0.6fr] items-center gap-3.5">
                          <span className="truncate font-mono text-[10.5px] text-text-body">{w.name}</span>
                          <span className="h-1 bg-line-subtle">
                            <span className="block h-full bg-blue" style={{ width: `${(w.storage_used_bytes / maxWsUsage) * 100}%` }} />
                          </span>
                          <span className="text-right font-mono text-[10px] text-text-muted">{(w.storage_used_bytes / GB).toFixed(1)} GB</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AllocationModal open={allocOpen} onClose={() => setAllocOpen(false)} groupId={groupId ?? ''} orgs={orgs} capBytes={capBytes} />
    </>
  )
}

export default function GroupStorageQuotaPage() {
  return (
    <ErrorBoundary>
      <GroupStorageQuotaPageContent />
    </ErrorBoundary>
  )
}
