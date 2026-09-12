import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import InviteMemberModal from '@/components/workspace/InviteMemberModal'
import ManageMemberPanel from '@/components/workspace/ManageMemberPanel'
import { useProjectMembers } from '@/features/project-members/hooks'
import { useProjects } from '@/features/projects/hooks'
import { usePendingInvitations, useWorkspaceMembers } from '@/features/workspace-members/hooks'
import { ASSIGNABLE_ROLES } from '@/features/workspace-members/types'
import type { MemberOrInvitation, PendingInvitation, WorkspaceMember } from '@/features/workspace-members/types'
import { useWorkspace } from '@/features/workspaces/hooks'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

// S4W-02, US-002 (desain "AW Members Roles.dc.html") -- versi S2/S3 cuma
// tabel member + section undangan pending terpisah, TANPA stats/filter/
// paginasi/grid gabungan; halaman ini menggantikannya sesuai desain
// penuh: stats bar, filter Project+Role, paginasi bernomor, satu grid
// (member aktif + undangan pending digabung), dan panel Kelola Member
// tunggal (lihat ManageMemberPanel). Filter Project TIDAK butuh endpoint
// baru -- reuse GET .../projects + GET /projects/:id/members, diirisankan
// client-side terhadap email member (S4W-01 kickoff notes).
const ROLE_FILTER_OPTIONS = ['Semua', ...ASSIGNABLE_ROLES.map((r) => r.key), 'admin_workspace']
const PER_PAGE_OPTIONS = [10, 20, 50]

function roleLabel(role: string) {
  return role.replace('_', ' ').toUpperCase()
}

function WorkspaceMembersPageContent() {
  const { wsId } = useParams<{ wsId: string }>()
  const workspaceId = wsId ?? ''
  const members = useWorkspaceMembers(workspaceId)
  const invitations = usePendingInvitations(workspaceId)
  const { data: workspace } = useWorkspace(workspaceId)
  const workspaceName = workspace?.name ?? workspaceId
  const projects = useProjects(workspaceId)

  const currentUser = useAuthStore((state) => state.user)
  const platformRole = currentUser?.platform_role
  const viewerRole = members.data?.find((m) => m.user_id === currentUser?.id)?.role
  const canManage = platformRole === 'platform_admin' || platformRole === 'group_admin' || viewerRole === 'admin_workspace'

  const [inviteOpen, setInviteOpen] = useState(false)
  const [selected, setSelected] = useState<MemberOrInvitation | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [fProject, setFProject] = useState('Semua')
  const [fRole, setFRole] = useState('Semua')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const projectMembers = useProjectMembers(fProject !== 'Semua' ? fProject : '')
  const projectEmails = useMemo(
    () => new Set((projectMembers.data ?? []).map((m) => m.email.toLowerCase())),
    [projectMembers.data],
  )

  const memberList = useMemo(() => members.data ?? [], [members.data])
  const invitationList = useMemo(() => invitations.data ?? [], [invitations.data])

  const stats = {
    total: memberList.length,
    projectManager: memberList.filter((m) => m.role === 'project_manager').length,
    editor: memberList.filter((m) => m.role === 'editor').length,
    approver: memberList.filter((m) => m.role === 'approver').length,
    pending: invitationList.length,
  }

  const allRows: MemberOrInvitation[] = useMemo(
    () => [
      ...memberList.map((data): MemberOrInvitation => ({ kind: 'member', data })),
      ...invitationList.map((data): MemberOrInvitation => ({ kind: 'invitation', data })),
    ],
    [memberList, invitationList],
  )

  const matched = allRows.filter((row) => {
    if (fRole !== 'Semua' && row.data.role !== fRole) return false
    if (fProject !== 'Semua') {
      if (row.kind !== 'member') return false
      if (!projectEmails.has(row.data.email.toLowerCase())) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(matched.length / perPage))
  const activePage = Math.min(page, totalPages)
  const start = (activePage - 1) * perPage
  const paged = matched.slice(start, start + perPage)

  const activeFilters = (fProject !== 'Semua' ? 1 : 0) + (fRole !== 'Semua' ? 1 : 0)
  const selectedProject = projects.data?.find((p) => p.id === fProject)
  const projectScope =
    fProject === 'Semua'
      ? `Seluruh member workspace ${workspaceName}`
      : `Member project ${selectedProject?.name ?? '...'} · ${matched.length} orang`

  const resetFilters = () => {
    setFProject('Semua')
    setFRole('Semua')
    setPage(1)
  }

  const isLoading = members.isLoading || invitations.isLoading
  const isError = members.isError || invitations.isError

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">Member & Roles</h1>
          {canManage && (
            <Button onClick={() => setInviteOpen(true)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
              + Undang Member
            </Button>
          )}
        </div>

        {isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
        {isError && <p className="text-sm text-destructive">Gagal memuat daftar member.</p>}

        {!isLoading && !isError && (
          <>
            <div className="flex flex-wrap gap-3">
              <StatCard label="Total Member" value={stats.total} />
              <StatCard label="Project Manager" value={stats.projectManager} />
              <StatCard label="Editor" value={stats.editor} />
              <StatCard label="Approver" value={stats.approver} />
              <StatCard label="Pending" value={stats.pending} accent="amber" />
            </div>

            <div className="border border-line">
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5"
              >
                <span className="w-2.5 font-mono text-[10px] text-text-muted">{filtersOpen ? '▾' : '▸'}</span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-text-muted">Filter</span>
                <span
                  className={cn(
                    'border px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em]',
                    activeFilters ? 'border-signal text-signal' : 'border-line-subtle text-text-faint',
                  )}
                >
                  {activeFilters ? `${activeFilters} aktif` : 'tidak ada'}
                </span>
                <span className="ml-auto font-mono text-[9px] text-text-faint">
                  {matched.length === 0
                    ? '0 member'
                    : `${start + 1}–${Math.min(start + perPage, matched.length)} dari ${matched.length} member`}
                </span>
              </button>
              {filtersOpen && (
                <div className="flex flex-col gap-3.5 border-t border-line p-3.5">
                  <div className="flex flex-wrap items-end gap-3.5">
                    <FilterSelect
                      label="Project"
                      value={fProject}
                      onChange={(v) => {
                        setFProject(v)
                        setPage(1)
                      }}
                      options={['Semua', ...((projects.data ?? []).map((p) => ({ value: p.id, label: p.name })))]}
                    />
                    <FilterSelect
                      label="Role"
                      value={fRole}
                      onChange={(v) => {
                        setFRole(v)
                        setPage(1)
                      }}
                      options={ROLE_FILTER_OPTIONS.map((r) => (r === 'Semua' ? 'Semua' : { value: r, label: roleLabel(r) }))}
                    />
                  </div>
                  <div className="flex flex-wrap items-end gap-3.5">
                    <FilterSelect
                      label="Baris / Hal"
                      value={String(perPage)}
                      onChange={(v) => {
                        setPerPage(Number(v))
                        setPage(1)
                      }}
                      options={PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                    />
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="border border-line-subtle px-3.5 py-2 font-mono text-[9.5px] uppercase tracking-[0.06em] text-text-muted hover:border-signal hover:text-signal"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="font-mono text-[9px] text-text-faint">{projectScope}</div>
                </div>
              )}
            </div>

            <div className="border border-line">
              <div className="grid grid-cols-[1.8fr_1.1fr_0.8fr_0.7fr_0.8fr] gap-3 border-b border-line bg-raised-1 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                <span>Member</span>
                <span>Role</span>
                <span>Gabung</span>
                <span>Status</span>
                <span>Aksi</span>
              </div>
              {paged.length === 0 && (
                <p className="p-4 font-mono text-[10.5px] leading-relaxed text-text-muted">
                  Tidak ada member pada tampilan ini. Gunakan tombol + Undang Member untuk menambahkan anggota ke workspace.
                </p>
              )}
              {paged.map((row) => (
                <MemberRow
                  key={row.kind === 'member' ? row.data.user_id : row.data.id}
                  row={row}
                  canManage={canManage}
                  onManage={() => setSelected(row)}
                />
              ))}
              {matched.length > 0 && totalPages > 1 && (
                <div className="flex flex-wrap items-center gap-2 border-t border-line bg-raised-1 px-3.5 py-2.5">
                  <span className="font-mono text-[9px] tracking-[0.06em] text-text-faint">
                    {start + 1}–{Math.min(start + perPage, matched.length)} dari {matched.length} member
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={activePage <= 1}
                      className="border border-line-subtle px-2.5 py-1.5 font-mono text-[10px] text-text-muted disabled:opacity-35 disabled:cursor-not-allowed"
                    >
                      ◄ Sblm
                    </button>
                    {pageNumbers(activePage, totalPages).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={cn(
                          'min-w-[26px] border px-2 py-1.5 text-center font-mono text-[10px]',
                          p === activePage ? 'border-signal bg-signal text-bg-deep' : 'border-line-subtle text-text-muted',
                        )}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={activePage >= totalPages}
                      className="border border-line-subtle px-2.5 py-1.5 font-mono text-[10px] text-text-muted disabled:opacity-35 disabled:cursor-not-allowed"
                    >
                      Brkt ►
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ManageMemberPanel
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        target={selected}
        onClose={() => setSelected(null)}
      />
      <InviteMemberModal
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </>
  )
}

function pageNumbers(active: number, total: number) {
  let lo = Math.max(1, active - 2)
  let hi = Math.min(total, active + 2)
  if (hi - lo < 4) {
    lo = Math.max(1, hi - 4)
    hi = Math.min(total, lo + 4)
  }
  const out: number[] = []
  for (let p = lo; p <= hi; p++) out.push(p)
  return out
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'amber' }) {
  return (
    <div className="min-w-[110px] flex-1 border border-line px-3.5 py-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted">{label}</div>
      <div className={cn('mt-1 text-2xl font-extrabold', accent === 'amber' ? 'text-amber' : 'text-text-bone')}>{value}</div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: (string | { value: string; label: string })[]
}) {
  return (
    <div className="flex min-w-[190px] flex-1 flex-col gap-1.5">
      <label className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-text-muted">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-line bg-bg-deep px-2.5 py-2 font-mono text-[11px] text-text-body outline-none"
      >
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )
        })}
      </select>
    </div>
  )
}

function MemberRow({
  row,
  canManage,
  onManage,
}: {
  row: MemberOrInvitation
  canManage: boolean
  onManage: () => void
}) {
  const isMember = row.kind === 'member'
  const data = row.data as WorkspaceMember & Partial<PendingInvitation>
  // admin_workspace terkunci dari panel Kelola AW baik sudah aktif MAUPUN
  // masih undangan pending -- keduanya wewenang Group Admin, bukan AW
  // (S4W-01 guard yang sama, konsisten dengan desain "DARI GROUP ADMIN").
  const locked = data.role === 'admin_workspace'
  const displayName = isMember ? data.display_name || data.email : data.email
  const joined = isMember ? new Date((data as WorkspaceMember).joined_at).toLocaleDateString('id-ID') : '—'

  return (
    <div className="grid grid-cols-[1.8fr_1.1fr_0.8fr_0.7fr_0.8fr] items-center gap-3 border-t border-line px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-[13px] text-text-body">{displayName}</div>
        <div className="mt-1 truncate font-mono text-[8.5px] text-text-muted">{data.email}</div>
      </div>
      <div>
        <span className="w-fit border border-line-strong px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-text-body">
          {roleLabel(data.role)}
        </span>
        <div className="mt-1 font-mono text-[8.5px] text-text-faint">
          {locked ? 'DARI GROUP ADMIN' : isMember ? 'DAPAT DIUBAH' : ''}
        </div>
      </div>
      <span className="font-mono text-[10px] text-text-muted">{joined}</span>
      <span
        className={cn(
          'w-fit border px-1.5 py-0.5 font-mono text-[8.5px] uppercase',
          isMember ? 'border-mint text-mint' : 'border-amber text-amber',
        )}
      >
        {isMember ? 'Aktif' : 'Pending'}
      </span>
      {locked || !canManage ? (
        <span className="font-mono text-[10px] text-text-faint">{locked ? '— Kunci' : ''}</span>
      ) : (
        <button onClick={onManage} className="w-fit font-mono text-[10px] text-text-muted hover:text-signal">
          ✎ Kelola
        </button>
      )}
    </div>
  )
}

export default function WorkspaceMembersPage() {
  return (
    <ErrorBoundary>
      <WorkspaceMembersPageContent />
    </ErrorBoundary>
  )
}
