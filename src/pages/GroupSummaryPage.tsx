import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'

import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useCrossOrgMemberships } from '@/features/cross-org-memberships/hooks'
import { formatGroupAuditNarrative } from '@/features/group-audit/narrative'
import { useGroupSummary } from '@/features/group-summary/hooks'
import { cn } from '@/lib/utils'

type ViewTab = 'Aktivitas' | 'Peringatan Kuota' | 'Keanggotaan Lintas Organisasi'

const TYPE_TONE: Record<string, string> = { CREATE: 'border-mint text-mint', UPDATE: 'border-blue text-blue', DELETE: 'border-destructive text-destructive', ACCESS: 'border-amber text-amber' }
const TYPE_ICON: Record<string, string> = { CREATE: '＋', UPDATE: '✎', DELETE: '⊘', ACCESS: '⇄' }

const GB = 1024 * 1024 * 1024
function fmtGB(bytes: number) {
  return (bytes / GB).toFixed(1)
}

function quotaLevel(pct: number): { label: string; tone: string } {
  if (pct >= 100) return { label: 'BLOKIR', tone: 'text-destructive' }
  if (pct >= 95) return { label: 'KRITIS', tone: 'text-destructive' }
  if (pct >= 80) return { label: 'WARNING', tone: 'text-amber' }
  return { label: 'NORMAL', tone: 'text-mint' }
}

function StatCard({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) {
  return (
    <div className="min-w-[150px] flex-1 border border-line-strong bg-panel p-3.5">
      <div className="font-mono text-[9px] tracking-[0.12em] text-text-dim">{label}</div>
      <div className={cn('mt-1 text-2xl font-extrabold', tone ?? 'text-text-bone')}>{value}</div>
      <div className="mt-1 font-mono text-[9px] text-text-dim">{note}</div>
    </div>
  )
}

// GroupSummaryPage (US-010b.., Track S4G S4G-29/30, desain "GA
// Ringkasan.dc.html") -- landing default GA setelah login (Login.tsx),
// menggantikan redirect sementara ke /organizations (IG-34). Murni
// agregasi dari GET /groups/:id/summary (org/workspace/member/kuota/
// storage, aktivitas terbaru reuse audit_logs, to-do actionable, distribusi
// member per-org) -- tidak ada state/tabel baru di FE.
//
// Tab "Keanggotaan Lintas Organisasi" reuse `useCrossOrgMemberships` (data
// SAMA dengan CrossOrgMembershipsPage) TAPI cuma SATU filter "ORG TUJUAN"
// (bukan dua filter "asal"+"tujuan" seperti desain "GA Ringkasan.dc.html")
// -- `project_members.is_scoped` tidak pernah menyimpan org ASAL user,
// cuma org TUJUAN (tempat project-nya) lewat GET .../cross-org-memberships
// yang sudah ada; menampilkan filter "org asal" akan menyiratkan data yang
// sebetulnya tidak pernah disimpan sistem.
function GroupSummaryPageContent() {
  const outletContext = useOutletContext<GroupAdminOutletContext>()
  const isBareRender = !outletContext
  const { groupId } = outletContext ?? { groupId: undefined }
  const gid = isBareRender ? '' : (groupId ?? '')
  const navigate = useNavigate()

  const [tab, setTab] = useState<ViewTab>('Aktivitas')
  const [crossToOrg, setCrossToOrg] = useState('')

  const summary = useGroupSummary(gid)
  const cross = useCrossOrgMemberships(gid, crossToOrg)

  const s = summary.data

  const crossRows = useMemo(() => {
    const rows = cross.data ?? []
    const byUser = new Map<string, { name: string; email: string; projects: { name: string; org: string; role: string }[] }>()
    for (const m of rows) {
      const entry = byUser.get(m.user_id) ?? { name: m.display_name || m.email, email: m.email, projects: [] }
      entry.projects.push({ name: m.project_name, org: m.org_name, role: m.role })
      byUser.set(m.user_id, entry)
    }
    return Array.from(byUser.values())
  }, [cross.data])

  const quotaRows = useMemo(() => {
    const rows = (s?.org_distribution ?? []).map((o) => {
      const pct = o.storage_quota_bytes > 0 ? Math.min(100, Math.round((o.storage_used_bytes / o.storage_quota_bytes) * 100)) : 0
      return { ...o, pct, level: quotaLevel(pct) }
    })
    return rows.sort((a, b) => b.pct - a.pct)
  }, [s])

  const maxMembers = Math.max(1, ...(s?.org_distribution ?? []).map((o) => o.member_count))

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex gap-1.5">
        {(['Aktivitas', 'Peringatan Kuota', 'Keanggotaan Lintas Organisasi'] as ViewTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'border px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em]',
              tab === t ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted hover:text-text-bone',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {summary.isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
      {summary.isError && <p className="text-sm text-destructive">Gagal memuat ringkasan grup.</p>}

      {s && (
        <>
          <div className="flex flex-wrap gap-3">
            <StatCard label="ORGANISASI" value={String(s.stats.org_total)} note={`${s.stats.org_active} AKTIF · ${s.stats.org_inactive} NONAKTIF`} />
            <StatCard label="WORKSPACE" value={String(s.stats.workspace_total)} note="DI SELURUH ORGANISASI" />
            <StatCard label="MEMBER" value={String(s.stats.member_total)} note={`${s.stats.pending_invites_total} UNDANGAN PENDING`} tone="text-mint" />
            <StatCard
              label="KUOTA TERALOKASI"
              value={`${fmtGB(s.stats.quota_allocated_bytes)} / ${fmtGB(s.stats.quota_ceiling_bytes)} GB`}
              note={`SISA ${fmtGB(Math.max(0, s.stats.quota_ceiling_bytes - s.stats.quota_allocated_bytes))} GB`}
              tone="text-signal"
            />
            <StatCard
              label="STORAGE TERPAKAI"
              value={`${fmtGB(s.stats.storage_used_bytes)} GB`}
              note={`${s.stats.quota_allocated_bytes ? Math.round((s.stats.storage_used_bytes / s.stats.quota_allocated_bytes) * 100) : 0}% DARI ALOKASI`}
            />
          </div>

          {tab === 'Aktivitas' && (
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.35fr_1fr]">
              <div className="flex flex-col border border-line-strong">
                <div className="flex items-center justify-between gap-3 border-b border-line-strong bg-raised-2 px-4 py-2.5">
                  <span className="font-mono text-[9px] tracking-[0.12em] text-text-dim">AKTIVITAS STRUKTURAL TERBARU</span>
                  <button type="button" onClick={() => navigate('/audit-trail')} className="font-mono text-[9px] text-text-muted hover:text-signal">
                    AUDIT TRAIL →
                  </button>
                </div>
                {s.activity.length === 0 && <p className="p-4 text-sm text-text-muted">Belum ada aktivitas.</p>}
                {s.activity.map((entry) => {
                  const n = formatGroupAuditNarrative(entry)
                  return (
                    <div key={entry.id} className="flex gap-3 border-t border-line px-4 py-3">
                      <span className={cn('mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center border text-[11px]', TYPE_TONE[entry.type])}>
                        {TYPE_ICON[entry.type]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] text-text-bone">{n.text}</div>
                        <div className="mt-0.5 font-mono text-[9px] text-text-dim">
                          {(entry.actor_display_name ?? 'Sistem').toUpperCase()} ·{' '}
                          {new Date(entry.logged_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} ·{' '}
                          {n.scope}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <p className="border-t border-line-strong px-4 py-2.5 font-mono text-[8.5px] leading-relaxed text-text-dim">
                  Group Admin hanya melihat perubahan struktural — konten task, komentar, dan attachment tidak ditampilkan.
                </p>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="border border-line-strong">
                  <div className="border-b border-line-strong bg-raised-2 px-4 py-2.5 font-mono text-[9px] tracking-[0.12em] text-text-dim">PERLU TINDAKAN</div>
                  {[
                    {
                      count: s.todos.over_quota_orgs.length,
                      label: 'Organisasi melewati ambang 80%',
                      note: s.todos.over_quota_orgs.length ? s.todos.over_quota_orgs.map((o) => o.name).join(', ') : 'Semua organisasi di bawah ambang',
                      onClick: () => navigate('/storage-quota'),
                    },
                    {
                      count: s.todos.retention_soon.length,
                      label: 'Data dihapus permanen ≤ 10 hari',
                      note: s.todos.retention_soon.length ? 'Ekspor atau pulihkan sebelum eksekusi' : 'Tidak ada yang mendesak',
                      onClick: () => navigate('/data-retention'),
                    },
                    {
                      count: s.todos.pending_invites.length,
                      label: 'Undangan belum diterima',
                      note: s.todos.pending_invites.length
                        ? s.todos.pending_invites
                            .slice(0, 2)
                            .map((p) => p.email)
                            .join(', ')
                        : 'Tidak ada undangan tertunda',
                      onClick: () => navigate('/members'),
                    },
                    {
                      count: s.todos.inactive_orgs.length,
                      label: 'Organisasi nonaktif',
                      note: s.todos.inactive_orgs.length ? `${s.todos.inactive_orgs.map((o) => o.name).join(', ')} — retensi berjalan` : 'Seluruh organisasi aktif',
                      onClick: () => navigate('/organizations'),
                    },
                  ].map((t) => (
                    <div
                      key={t.label}
                      onClick={t.onClick}
                      className="flex cursor-pointer items-center gap-3 border-t border-line px-4 py-3 hover:bg-raised-2"
                    >
                      <span className={cn('min-w-[24px] font-mono text-[15px] font-bold', t.count ? 'text-amber' : 'text-mint')}>{t.count}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] text-text-bone">{t.label}</div>
                        <div className="mt-0.5 truncate font-mono text-[9px] text-text-dim">{t.note}</div>
                      </div>
                      <span className="font-mono text-[11px] text-text-dim">→</span>
                    </div>
                  ))}
                </div>

                <div className="flex-1 border border-line-strong">
                  <div className="border-b border-line-strong bg-raised-2 px-4 py-2.5 font-mono text-[9px] tracking-[0.12em] text-text-dim">DISTRIBUSI ORGANISASI</div>
                  <div className="flex flex-col gap-3 p-4">
                    {s.org_distribution.map((o) => (
                      <div key={o.id} className="flex flex-col gap-1.5">
                        <div className="flex justify-between gap-3 font-mono text-[9.5px]">
                          <span className="truncate text-text-body">{o.name}</span>
                          <span className="whitespace-nowrap text-text-dim">
                            {o.member_count} MEMBER · {o.workspace_count} WS
                          </span>
                        </div>
                        <span className="block h-1.5 bg-line-subtle">
                          <span className="block h-full bg-signal" style={{ width: `${Math.round((o.member_count / maxMembers) * 100)}%` }} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'Peringatan Kuota' && (
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center justify-between gap-4 border border-line-strong bg-panel p-4">
                <div>
                  <div className="font-mono text-[9px] tracking-[0.14em] text-text-dim">AMBANG NOTIFIKASI</div>
                  <div className="mt-1.5 text-[14px] font-semibold text-text-bone">80% peringatan awal · 95% kritis · 100% upload diblokir</div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/storage-quota')}
                  className="border border-signal px-3.5 py-2 font-mono text-[10px] text-signal"
                >
                  ATUR ALOKASI KUOTA
                </button>
              </div>

              <div className="border border-line-strong">
                <div className="grid grid-cols-[2fr_1.4fr_0.8fr_0.8fr] gap-3 border-b border-line-strong bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                  <span>Organisasi</span>
                  <span>Pemakaian</span>
                  <span>Ambang</span>
                  <span>Aksi</span>
                </div>
                {quotaRows.map((q) => (
                  <div key={q.id} className="grid grid-cols-[2fr_1.4fr_0.8fr_0.8fr] items-center gap-3 border-t border-line px-4 py-3">
                    <span className="truncate text-[12.5px] text-text-bone">{q.name}</span>
                    <div className="flex flex-col gap-1">
                      <div className={cn('flex justify-between font-mono text-[9px]', q.level.tone)}>
                        <span className="text-text-muted">
                          {fmtGB(q.storage_used_bytes)} / {fmtGB(q.storage_quota_bytes)} GB
                        </span>
                        <span>{q.pct}%</span>
                      </div>
                      <span className="block h-1 bg-line-subtle">
                        <span className={cn('block h-full', q.level.label === 'NORMAL' ? 'bg-mint' : q.level.label === 'WARNING' ? 'bg-amber' : 'bg-destructive')} style={{ width: `${q.pct}%` }} />
                      </span>
                    </div>
                    <span className={cn('font-mono text-[9px] font-semibold', q.level.tone)}>● {q.level.label}</span>
                    <button type="button" onClick={() => navigate('/storage-quota')} className="justify-self-start font-mono text-[9.5px] text-text-muted hover:text-signal">
                      TAMBAH →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Keanggotaan Lintas Organisasi' && (
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center gap-2 border border-line-strong bg-panel p-3.5">
                <span className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">ORG TUJUAN</span>
                {[{ id: '', name: 'SEMUA' }, ...s.org_distribution].map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setCrossToOrg(o.id)}
                    className={cn(
                      'border px-2.5 py-1 font-mono text-[9.5px]',
                      crossToOrg === o.id ? 'border-signal text-signal' : 'border-line-strong text-text-muted',
                    )}
                  >
                    {o.name.toUpperCase()}
                  </button>
                ))}
                <span className="ml-auto font-mono text-[9px] text-text-dim">
                  {crossRows.length} user · {cross.data?.length ?? 0} project lintas organisasi
                </span>
              </div>

              <div className="border border-line-strong">
                <div className="grid grid-cols-[1.6fr_2.2fr_0.9fr] gap-3 border-b border-line-strong bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                  <span>User</span>
                  <span>Project di Organisasi Lain</span>
                  <span>Aksi</span>
                </div>
                {cross.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
                {crossRows.length === 0 && !cross.isLoading && (
                  <p className="p-6 text-center font-mono text-[10px] text-text-muted">Tidak ada keanggotaan lintas organisasi pada filter ini.</p>
                )}
                {crossRows.map((u) => (
                  <div key={u.email} className="grid grid-cols-[1.6fr_2.2fr_0.9fr] items-center gap-3 border-t border-line px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] text-text-bone">{u.name}</div>
                      <div className="truncate font-mono text-[8.5px] text-text-dim">{u.email}</div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {u.projects.map((p, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                          <span className="text-[12px] text-text-body">{p.name}</span>
                          <span className="border border-line-strong px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.06em] text-text-muted">{p.role}</span>
                          <span className="font-mono text-[8.5px] text-text-dim">{p.org}</span>
                        </div>
                      ))}
                    </div>
                    <span className="font-mono text-[9px] text-mint">AKSES AKTIF</span>
                  </div>
                ))}
                <p className="border-t border-line-strong px-4 py-2.5 font-mono text-[8.5px] leading-relaxed text-text-dim">
                  Metadata struktural saja — konten task, komentar, dan attachment tidak ditampilkan. Menonaktifkan akun user mencabut seluruh
                  project-scoped access lintas organisasinya secara otomatis.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function GroupSummaryPage() {
  return (
    <ErrorBoundary>
      <GroupSummaryPageContent />
    </ErrorBoundary>
  )
}
