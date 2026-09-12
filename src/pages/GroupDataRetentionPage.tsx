import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'

import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import RetentionPolicyModal from '@/components/retention/RetentionPolicyModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useOrganizationList, useReactivateOrganization, useRestoreOrganization } from '@/features/organizations/hooks'
import { useGroups } from '@/features/platform-admin/hooks'
import { useRestoreProject } from '@/features/projects/hooks'
import { retentionKeys, useRequestRetentionExport, useRetentionSchedule } from '@/features/retention/hooks'
import type { RetentionScheduleItem } from '@/features/retention/types'
import { useRestoreWorkspace } from '@/features/workspaces/hooks'
import { cn } from '@/lib/utils'

type ViewTab = 'Kebijakan' | 'Jadwal Penghapusan'

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'amber' | 'destructive' }) {
  return (
    <div className="min-w-[150px] flex-1 border border-line bg-panel p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">{label}</div>
      <div className={cn('mt-1.5 text-xl font-bold', tone === 'amber' && 'text-amber', tone === 'destructive' && 'text-destructive')}>{value}</div>
    </div>
  )
}

// org (dinonaktifkan) vs org_deleted (soft-deleted, 2026-09-12) -- orthogonal,
// label+tone beda supaya baris tidak ambigu di grid (lihat komentar
// RetentionScheduleItem).
const KIND_LABEL: Record<RetentionScheduleItem['kind'], string> = { org: 'ORG', org_deleted: 'ORG·HAPUS', workspace: 'WS', project: 'PROJ' }
const KIND_TONE: Record<RetentionScheduleItem['kind'], string> = {
  org: 'text-amber border-amber',
  org_deleted: 'text-destructive border-destructive',
  workspace: 'text-signal border-signal',
  project: 'text-blue border-blue',
}

const TIMELINE = [
  { day: 'HARI 0', title: 'Organisasi dinonaktifkan', note: 'Akses seluruh member diblokir. Data tetap tersimpan; aktifkan kembali kapan saja.', dot: 'bg-text-muted' },
  { day: 'HARI 60', title: 'Peringatan awal', note: 'Notifikasi in-app dan email ke Group Admin berisi jadwal penghapusan dan tautan ekspor.', dot: 'bg-amber' },
  { day: 'HARI 80', title: 'Pengingat final', note: '10 hari sebelum penghapusan. Kesempatan terakhir aktifkan kembali atau ekspor.', dot: 'bg-destructive' },
  { day: 'HARI 90', title: 'Penghapusan permanen', note: 'Data operasional dihapus permanen. Audit trail tetap disimpan hingga 3 tahun.', dot: 'bg-destructive' },
]

// GroupDataRetentionPage (Data Retention, Track S4G, desain "GA Data
// Retention.dc.html") -- dua tab DI DALAM halaman sendiri (Kebijakan/
// Jadwal Penghapusan, sama pola Storage & Kuota Ringkasan/Per-Organisasi).
// Ekspor SENGAJA disederhanakan (dikonfirmasi user): tanpa modal preview
// cakupan arsip (tidak ada task/attachment sungguhan untuk ditampilkan
// jumlahnya) -- klik Ekspor langsung kirim email tautan unduhan manifest
// metadata, lihat implementation_gaps.md.
function GroupDataRetentionPageContent() {
  const outletContext = useOutletContext<GroupAdminOutletContext>()
  const isBareRender = !outletContext
  const { registerCta, groupId } = outletContext ?? { registerCta: () => {}, groupId: undefined }
  const [tab, setTab] = useState<ViewTab>('Kebijakan')
  const [policyOpen, setPolicyOpen] = useState(false)
  const [exportedMsg, setExportedMsg] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const orgList = useOrganizationList(isBareRender ? undefined : groupId)
  const schedule = useRetentionSchedule(isBareRender ? '' : (groupId ?? ''))
  const groups = useGroups('')
  const reactivateOrg = useReactivateOrganization()
  const restoreOrganization = useRestoreOrganization()
  const restoreWorkspace = useRestoreWorkspace()
  const restoreProject = useRestoreProject()
  const requestExport = useRequestRetentionExport(groupId ?? '')

  useEffect(() => {
    registerCta(() => setPolicyOpen(true))
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const orgs = useMemo(() => orgList.data?.organizations ?? [], [orgList.data])
  const items = useMemo(() => schedule.data ?? [], [schedule.data])
  const activeGroup = groups.data?.find((g) => g.id === groupId) ?? null
  const retentionMin = activeGroup?.min_retention_days ?? 30
  const retentionMax = activeGroup?.max_retention_days ?? 365
  const tierName = activeGroup?.tier ?? '-'

  const orgRows = useMemo(
    () =>
      orgs.map((o) => {
        const own = items.filter((it) => it.org_name === o.name).sort((a, b) => a.days_left - b.days_left)
        const soonest = own[0]
        return {
          org: o,
          pending: own.length,
          next: soonest ? `${new Date(soonest.purge_at).toLocaleDateString('id-ID')} · ${soonest.days_left} hari` : '—',
        }
      }),
    [orgs, items],
  )

  const invalidateSchedule = () => queryClient.invalidateQueries({ queryKey: retentionKeys.schedule(groupId ?? '') })

  const handleRestore = (item: RetentionScheduleItem) => {
    if (item.kind === 'org') reactivateOrg.mutate(item.item_id, { onSuccess: invalidateSchedule })
    else if (item.kind === 'org_deleted') restoreOrganization.mutate(item.item_id, { onSuccess: invalidateSchedule })
    else if (item.kind === 'workspace') restoreWorkspace.mutate(item.item_id, { onSuccess: invalidateSchedule })
    else restoreProject.mutate(item.item_id, { onSuccess: invalidateSchedule })
  }

  const handleExport = (item: RetentionScheduleItem) => {
    requestExport.mutate(
      { kind: item.kind, itemId: item.item_id },
      {
        onSuccess: () =>
          setExportedMsg(`Arsip untuk "${item.item_name}" sedang disiapkan. Tautan unduhan dikirim ke email Anda dan berlaku 72 jam.`),
      },
    )
  }

  return (
    <>
      <div className="space-y-3.5 p-6">
        <div className="flex gap-1.5">
          {(['Kebijakan', 'Jadwal Penghapusan'] as ViewTab[]).map((t) => (
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

        {tab === 'Kebijakan' ? (
          <>
            <div className="border border-line bg-panel p-5">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Kebijakan Platform</div>
              <div className="mt-1.5 text-[15px] font-bold">Retensi dihitung sejak organisasi dinonaktifkan</div>
              <p className="mt-1 max-w-[560px] font-mono text-[9.5px] leading-relaxed text-text-muted">
                Organisasi dan workspace tidak memiliki masa kadaluarsa. Hitungan retensi hanya dimulai saat Group Admin
                menonaktifkan organisasi, atau saat workspace/project dihapus.
              </p>
              <div className="mt-3 flex gap-6">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">Data Operasional</div>
                  <div className="mt-1 text-xl font-extrabold text-signal">90 hari</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">Audit Trail</div>
                  <div className="mt-1 text-xl font-extrabold text-mint">3 tahun</div>
                </div>
              </div>
            </div>

            <div className="border border-line">
              <div className="border-b border-line bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                Linimasa Setelah Organisasi Dinonaktifkan
              </div>
              <div className="flex items-start gap-3 p-4">
                {TIMELINE.map((p, i) => (
                  <div key={p.day} className="flex-1">
                    <div className="flex items-center">
                      <span className={cn('h-2.5 w-2.5 flex-shrink-0', p.dot)} />
                      {i < TIMELINE.length - 1 && <span className="h-px flex-1 bg-line-strong" />}
                    </div>
                    <div className="mt-2 font-mono text-[9.5px] font-semibold">{p.day}</div>
                    <div className="mt-1 pr-2 text-[12px] text-text-body">{p.title}</div>
                    <div className="mt-1 pr-2 font-mono text-[9px] leading-relaxed text-text-dim">{p.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-line">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-raised-2 px-4 py-2.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">Retensi Soft-Delete per Organisasi</span>
                <span className="font-mono text-[9px] text-text-muted">
                  Batas Platform Admin · Tier {tierName.toUpperCase()}: {retentionMin}-{retentionMax} hari
                </span>
              </div>
              <div className="grid grid-cols-[1.8fr_1fr_1fr_1.4fr] gap-3 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                <span>Organisasi</span>
                <span>Retensi</span>
                <span>Item Tertunda</span>
                <span>Penghapusan Terdekat</span>
              </div>
              {orgRows.map((r) => (
                <div key={r.org.id} className="grid grid-cols-[1.8fr_1fr_1fr_1.4fr] items-center gap-3 border-t border-line px-4 py-3">
                  <span className="truncate text-[12.5px] text-text-body">{r.org.name}</span>
                  <span className="font-mono text-[11px] text-text-body">{r.org.retention_days} hari</span>
                  <span className="font-mono text-[11px] text-text-muted">{r.pending}</span>
                  <span className="font-mono text-[10px] text-text-muted">{r.next}</span>
                </div>
              ))}
              {orgRows.length === 0 && <p className="p-4 text-sm text-text-muted">Belum ada organisasi.</p>}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <StatCard label="Item Terjadwal" value={String(items.length)} />
              <StatCard label="Hapus ≤ 10 Hari" value={String(items.filter((it) => it.days_left <= 10).length)} tone="destructive" />
              <StatCard label="Organisasi Nonaktif" value={String(items.filter((it) => it.kind === 'org').length)} tone="amber" />
            </div>

            {exportedMsg && (
              <p className="relative border border-mint p-3 pr-8 text-[11px] text-mint">
                ✓ {exportedMsg}
                <button type="button" onClick={() => setExportedMsg(null)} className="absolute right-2 top-2 opacity-60 hover:opacity-100">
                  ✕
                </button>
              </p>
            )}

            <div className="border border-line">
              <div className="grid grid-cols-[2.2fr_0.7fr_0.9fr_0.6fr_0.8fr] gap-3 border-b border-line bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                <span>Item</span>
                <span>Jenis</span>
                <span>Eksekusi Pada</span>
                <span>Sisa</span>
                <span>Aksi</span>
              </div>
              {items.length === 0 && <p className="p-4 text-sm text-text-muted">Tidak ada data yang dijadwalkan untuk dihapus.</p>}
              {items.map((it) => (
                <div key={`${it.kind}-${it.item_id}`} className="grid grid-cols-[2.2fr_0.7fr_0.9fr_0.6fr_0.8fr] items-center gap-3 border-t border-line px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] text-text-body">{it.item_name}</div>
                    <div className="truncate font-mono text-[9px] text-text-muted">{it.org_name}</div>
                  </div>
                  <span className={cn('w-fit border px-1.5 py-0.5 font-mono text-[9.5px]', KIND_TONE[it.kind])}>{KIND_LABEL[it.kind]}</span>
                  <span className="font-mono text-[10px] text-text-body">{new Date(it.purge_at).toLocaleDateString('id-ID')}</span>
                  <span
                    className={cn(
                      'font-mono text-[10px] font-semibold',
                      it.days_left <= 10 ? 'text-destructive' : it.days_left <= 30 ? 'text-amber' : 'text-mint',
                    )}
                  >
                    {it.days_left} hari
                  </span>
                  <div className="flex flex-col items-start gap-1">
                    <button
                      type="button"
                      onClick={() => handleExport(it)}
                      disabled={requestExport.isPending}
                      className="font-mono text-[9.5px] text-text-muted hover:text-signal disabled:opacity-40"
                    >
                      ⬇ Ekspor
                    </button>
                    <button type="button" onClick={() => handleRestore(it)} className="font-mono text-[9px] text-text-muted hover:text-mint">
                      ↺ Pulihkan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <RetentionPolicyModal
        open={policyOpen}
        onClose={() => setPolicyOpen(false)}
        groupId={groupId ?? ''}
        orgs={orgs}
        schedule={items}
        retentionMin={retentionMin}
        retentionMax={retentionMax}
        tierName={tierName}
      />
    </>
  )
}

export default function GroupDataRetentionPage() {
  return (
    <ErrorBoundary>
      <GroupDataRetentionPageContent />
    </ErrorBoundary>
  )
}
