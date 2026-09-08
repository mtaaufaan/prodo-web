import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import InviteMemberModal from '@/components/members/InviteMemberModal'
import ManageMemberModal from '@/components/members/ManageMemberModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useCancelPendingInvite, useGroupMembers, useResendPendingInvite } from '@/features/members/hooks'
import type { GroupMember, PendingGroupMember } from '@/features/members/types'
import { cn, logoBgClass } from '@/lib/utils'

const PAGE_SIZE = 10
const TABS = ['Semua', 'Group Admin', 'Eksekutif', 'Admin Workspace', 'Role Workspace', 'Pending'] as const
type Tab = (typeof TABS)[number]

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'mint' | 'destructive' | 'signal' }) {
  return (
    <div className="min-w-[130px] flex-1 border border-line bg-panel p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">{label}</div>
      <div
        className={cn(
          'mt-1.5 text-2xl font-bold',
          tone === 'mint' && 'text-mint',
          tone === 'destructive' && 'text-destructive',
          tone === 'signal' && 'text-signal',
        )}
      >
        {value}
      </div>
    </div>
  )
}

// Row -- gabungan member (sudah punya akun) + pending (undangan) jadi SATU
// list tampilan, supaya tab/pagination bisa dipakai bareng (Grid 1
// pattern: gabung dulu, baru paginate SATU list, bukan per sumber).
type Row =
  | { kind: 'member'; key: string; member: GroupMember }
  | { kind: 'pending'; key: string; pending: PendingGroupMember }

function roleBadges(m: GroupMember): string[] {
  const badges: string[] = []
  if (m.is_group_admin) badges.push('GROUP ADMIN')
  if (m.is_executive) badges.push('EKSEKUTIF')
  const wsRoles = new Set(m.workspace_roles.map((r) => r.role))
  wsRoles.forEach((r) => badges.push(r.toUpperCase().replace(/_/g, ' ')))
  return badges
}

function matchesTab(row: Row, tab: Tab): boolean {
  if (tab === 'Semua') return true
  if (tab === 'Pending') return row.kind === 'pending'
  if (row.kind === 'pending') return false
  const m = row.member
  if (tab === 'Group Admin') return m.is_group_admin
  if (tab === 'Eksekutif') return m.is_executive
  if (tab === 'Admin Workspace') return m.workspace_roles.some((r) => r.role === 'admin_workspace')
  if (tab === 'Role Workspace') return m.workspace_roles.length > 0 && !m.is_group_admin
  return true
}

// GroupMembersPage -- Members & Roles (forward-pull US-086, Track S4G,
// desain "GA Members Roles.dc.html"). Disederhanakan dari desain: SATU
// layout tabel (bukan varian sempit/lebar via ResizeObserver -- polesan
// responsif dekoratif, bukan fungsi inti), CSV bulk invite ditunda ke
// S4G-15-18 (track Import Data resmi).
function GroupMembersPageContent() {
  const { registerCta, groupId } = useOutletContext<GroupAdminOutletContext>()
  const [tab, setTab] = useState<Tab>('Semua')
  const [page, setPage] = useState(1)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const dir = useGroupMembers(groupId)
  const members = useMemo(() => dir.data?.members ?? [], [dir.data])
  const pending = useMemo(() => dir.data?.pending ?? [], [dir.data])

  useEffect(() => {
    registerCta(() => setInviteOpen(true))
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = useMemo(
    () => ({
      total: members.length,
      groupAdmin: members.filter((m) => m.is_group_admin).length,
      eksekutif: members.filter((m) => m.is_executive).length,
      adminWorkspace: members.filter((m) => m.workspace_roles.some((r) => r.role === 'admin_workspace')).length,
      pending: pending.length,
      nonaktif: members.filter((m) => m.suspended).length,
    }),
    [members, pending],
  )

  const rows: Row[] = useMemo(() => {
    const memberRows: Row[] = members.map((m) => ({ kind: 'member', key: m.user_id, member: m }))
    const pendingRows: Row[] = pending.map((p) => ({ kind: 'pending', key: p.id, pending: p }))
    return [...memberRows, ...pendingRows]
  }, [members, pending])

  const filteredRows = useMemo(() => rows.filter((r) => matchesTab(r, tab)), [rows, tab])
  useEffect(() => setPage(1), [tab])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const pageInputRef = useRef<HTMLInputElement>(null)
  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    setPage(Math.min(totalPages, Math.max(1, n)))
  }

  const selectedMember = members.find((m) => m.user_id === selectedUserId) ?? null

  return (
    <>
      <div className="space-y-3.5 p-6">
        <div className="flex flex-wrap gap-3">
          <StatCard label="Total Member" value={String(stats.total)} tone="signal" />
          <StatCard label="Group Admin" value={String(stats.groupAdmin)} />
          <StatCard label="Eksekutif" value={String(stats.eksekutif)} />
          <StatCard label="Admin Workspace" value={String(stats.adminWorkspace)} />
          <StatCard label="Undangan Pending" value={String(stats.pending)} tone="mint" />
          <StatCard label="Akses Nonaktif" value={String(stats.nonaktif)} tone="destructive" />
        </div>

        <div className="flex items-stretch gap-0.5 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'border-b-2 px-3.5 py-2 font-mono text-[11px] tracking-[0.04em]',
                tab === t ? 'border-signal text-text-bone' : 'border-transparent text-text-muted hover:text-text-bone',
              )}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="border border-line">
          <div className="border-b border-line bg-raised-2 px-4 py-2.5">
            <div className="grid grid-cols-[1.6fr_1.6fr_0.8fr_0.6fr] gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
              <span>Member</span>
              <span>Role</span>
              <span>Status</span>
              <span>Aksi</span>
            </div>
          </div>
          {dir.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
          {dir.isError && <p className="p-4 text-sm text-destructive">Gagal memuat direktori member.</p>}
          {filteredRows.length === 0 && !dir.isLoading && (
            <p className="p-4 text-sm text-text-muted">{rows.length === 0 ? 'Belum ada member.' : 'Tidak ada member pada tab ini.'}</p>
          )}
          {pagedRows.map((row) =>
            row.kind === 'member' ? (
              <MemberRow key={row.key} member={row.member} onManage={() => setSelectedUserId(row.member.user_id)} />
            ) : (
              <PendingRow key={row.key} pending={row.pending} groupId={groupId} />
            ),
          )}
          {filteredRows.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted disabled:opacity-40"
              >
                ← Sblm
              </button>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-dim">
                Halaman
                <input
                  key={currentPage}
                  ref={pageInputRef}
                  type="number"
                  min={1}
                  max={totalPages}
                  defaultValue={currentPage}
                  onKeyDown={(e) => e.key === 'Enter' && goToPage(e.currentTarget.value)}
                  className="w-11 border border-line-strong bg-input-bg px-1 py-0.5 text-center font-mono text-[10px] text-text-body focus-visible:border-signal focus-visible:outline-none"
                  aria-label="Nomor halaman"
                />
                / {totalPages} · {filteredRows.length} data
                <button
                  type="button"
                  onClick={() => goToPage(pageInputRef.current?.value ?? '')}
                  className="border border-line-strong px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.04em] text-text-muted"
                >
                  Ke
                </button>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted disabled:opacity-40"
              >
                Brkt →
              </button>
            </div>
          )}
        </div>
      </div>

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} groupId={groupId} />
      <ManageMemberModal member={selectedMember} groupId={groupId} onClose={() => setSelectedUserId(null)} />
    </>
  )
}

function MemberRow({ member, onManage }: { member: GroupMember; onManage: () => void }) {
  const badges = roleBadges(member)
  return (
    <div className="grid grid-cols-[1.6fr_1.6fr_0.8fr_0.6fr] items-center gap-3 border-t border-line px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center text-[12px] font-extrabold text-bg-deep',
            logoBgClass(member.user_id),
          )}
        >
          {member.display_name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] text-text-body">{member.display_name}</div>
          <div className="truncate font-mono text-[10px] text-text-muted">{member.email}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {badges.length === 0 && <span className="text-[11px] text-text-dim">—</span>}
        {badges.map((b) => (
          <span key={b} className="border border-line-strong px-1.5 py-0.5 font-mono text-[9px] tracking-[0.04em] text-text-muted">
            {b}
          </span>
        ))}
      </div>
      <span
        className={cn(
          'w-fit font-mono text-[10px] uppercase tracking-[0.06em]',
          member.suspended ? 'text-destructive' : 'text-mint',
        )}
      >
        {member.suspended ? 'Nonaktif' : 'Aktif'}
      </span>
      {member.is_group_admin ? (
        <span className="font-mono text-[10px] text-text-dim">🔒 Terkunci</span>
      ) : (
        <button onClick={onManage} className="w-fit font-mono text-[10px] text-text-muted hover:text-signal">
          ✎ Kelola
        </button>
      )}
    </div>
  )
}

function PendingRow({ pending, groupId }: { pending: PendingGroupMember; groupId: string }) {
  const resend = useResendPendingInvite(groupId)
  const cancel = useCancelPendingInvite(groupId)
  const busy = resend.isPending || cancel.isPending

  return (
    <div className="grid grid-cols-[1.6fr_1.6fr_0.8fr_0.6fr] items-center gap-3 border-t border-line px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-[13px] text-text-body">{pending.email}</div>
        <div className="font-mono text-[10px] text-text-muted">
          {pending.is_executive ? 'Undangan Eksekutif' : `${pending.workspace_name} · ${pending.org_name}`}
        </div>
      </div>
      <div>
        {!pending.is_executive && (
          <span className="border border-line-strong px-1.5 py-0.5 font-mono text-[9px] tracking-[0.04em] text-text-muted">
            {pending.role.toUpperCase().replace(/_/g, ' ')}
          </span>
        )}
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-amber">Pending</span>
      {pending.is_executive ? (
        <span className="font-mono text-[10px] text-text-dim">—</span>
      ) : (
        <div className="flex flex-col gap-1">
          <button
            disabled={busy}
            onClick={() => resend.mutate({ workspaceId: pending.workspace_id, invitationId: pending.id })}
            className="w-fit font-mono text-[9.5px] text-text-muted hover:text-signal disabled:opacity-40"
          >
            Kirim Ulang
          </button>
          <button
            disabled={busy}
            onClick={() => cancel.mutate({ workspaceId: pending.workspace_id, invitationId: pending.id })}
            className="w-fit font-mono text-[9.5px] text-text-muted hover:text-destructive disabled:opacity-40"
          >
            Batalkan
          </button>
        </div>
      )}
    </div>
  )
}

export default function GroupMembersPage() {
  return (
    <ErrorBoundary>
      <GroupMembersPageContent />
    </ErrorBoundary>
  )
}
