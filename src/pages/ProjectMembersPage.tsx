import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import AddMemberModal from '@/components/projects/AddMemberModal'
import ManageProjectMemberPanel from '@/components/projects/ManageProjectMemberPanel'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useMyContext } from '@/features/context/hooks'
import { useProjectMembersForManagement } from '@/features/project-members/hooks'
import { PROJECT_SCOPED_ROLES, type ProjectMember } from '@/features/project-members/types'
import { useProjects } from '@/features/projects/hooks'
import { cn } from '@/lib/utils'

// S3-24, US-009b (implementation_gaps.md IG-17 -- forward-pull projects/
// project_members). Disambungkan ke menu "Member Project" PM 2026-09-22
// (master frame PM, IG-90).
//
// Dibangun ulang total 2026-09-25 (IG-97 susulan, disamakan penuh dengan
// desain otoritatif "PM Member Project.dc.html", diminta user "saya lihat
// belum sesuai dengan desain claudenya") -- versi lama cuma grid polos
// tanpa stat/filter/search, role diubah lewat <select> inline langsung
// (bukan panel Kelola). STATUS kolom desain (AKTIF/PENDING) SENGAJA
// SELALU "AKTIF" -- AddMemberModal/`AddMember` backend menambah member
// LANGSUNG aktif, tidak ada alur undangan/acceptance untuk project-scoped
// member (beda dari workspace member yang punya user_invitations), jadi
// tidak ada state PENDING yang mungkin muncul di data nyata. Kartu stat
// "PENDING" tetap ditampilkan (akan selalu 0) demi kesetiaan ke desain,
// bukan data palsu -- 0 adalah nilai yang benar.
//
// Susulan sekalian (ditemukan user LEWAT PENGUJIAN LIVE: "kenapa isinya
// masih kosong, padahal untuk member project sudah ada fia sebagai role
// PM") -- keputusan awal MEMANG SALAH: PM sengaja disembunyikan total
// dari halaman ini dengan asumsi desain tidak menampilkannya, padahal `PM
// Member Project.dc.html` justru menampilkan PM sebagai baris (dikunci
// "— KUNCI", bukan disembunyikan) -- project dengan PM tapi 0
// project_members akan tampil KOSONG TOTAL padahal py 1 penanggung jawab.
// Diperluas LAGI (dikonfirmasi user: "yang dikecualikan itu admin group
// dan executive, untuk AW, DV, PM, Editor, Approver, dan Viewer yang
// ditampilkan hanya yang berhubungan dengan project") -- pakai
// `useProjectMembersForManagement` (?view=manage) yang menyertakan PM +
// SEMUA Admin Workspace/Division Viewer di workspace pemilik project ini
// (role-role itu scope-nya seluruh workspace, "berhubungan dengan
// project" lewat akses implisit). Baris non-project-scoped (PM/AW/DV)
// dikunci di ProjectMemberRow lewat cek role di luar PROJECT_SCOPED_ROLES
// (lihat komentar di sana) -- Group Admin/Executive/Platform Admin org-level
// SENGAJA tidak pernah masuk endpoint ini sama sekali.
function ProjectMembersPageContent() {
  const { wsId, projectId } = useParams<{ wsId: string; projectId: string }>()
  const workspaceId = wsId ?? ''
  const id = projectId ?? ''
  // outletContext undefined kalau diakses lewat rute lama tanpa shell
  // (/projects/:projectId/members, dipertahankan apa adanya) -- registerCta
  // no-op supaya tidak crash, CTA di rute lama itu memang tidak pernah ada.
  const outletContext = useOutletContext<WorkspaceOutletContext>()
  const { registerCta } = outletContext ?? { registerCta: () => {} }
  const { data, isLoading, isError } = useProjectMembersForManagement(id)
  const projects = useProjects(workspaceId)
  const myContext = useMyContext()
  const project = projects.data?.find((p) => p.id === id) ?? null
  const workspaceName = myContext.data?.workspace_memberships.find((w) => w.workspace_id === workspaceId)?.name ?? '—'

  const [addOpen, setAddOpen] = useState(false)
  const [manageTarget, setManageTarget] = useState<ProjectMember | null>(null)
  const [fRole, setFRole] = useState('Semua')
  const [fScope, setFScope] = useState('Semua')
  const [q, setQ] = useState('')

  useEffect(() => {
    registerCta(() => setAddOpen(true))
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registerCta stabil dari useCallback shell
  }, [])

  const members = data ?? []
  const scopedCount = members.filter((m) => m.is_scoped).length
  const stats = [
    { label: 'MEMBER PROJECT', value: members.length, className: 'text-text-bone' },
    { label: 'PROJECT-SCOPED', value: scopedCount, className: 'text-amber' },
    { label: 'DARI WORKSPACE', value: members.length - scopedCount, className: 'text-blue' },
    { label: 'PENDING', value: 0, className: 'text-violet' },
  ]

  const qLower = q.trim().toLowerCase()
  const rows = useMemo(
    () =>
      (data ?? [])
        .filter((m) => fRole === 'Semua' || m.role.toUpperCase() === fRole)
        .filter((m) => fScope === 'Semua' || (fScope === 'Project-scoped' ? m.is_scoped : !m.is_scoped))
        .filter((m) => !qLower || `${m.display_name} ${m.email}`.toLowerCase().includes(qLower)),
    [data, fRole, fScope, qLower],
  )

  return (
    <div className="space-y-3.5 p-6">
      {isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
      {isError && <p className="text-sm text-destructive">Gagal memuat daftar member project.</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="border border-line-strong bg-input-bg p-3.5">
                <div className="whitespace-nowrap font-mono text-[9px] tracking-[0.12em] text-text-dim">{s.label}</div>
                <div className={cn('mt-1.5 text-[22px] font-extrabold', s.className)}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 border border-line-strong bg-input-bg p-3">
            <span className="font-mono text-[9px] tracking-[0.14em] text-signal">PROJECT</span>
            <span className="text-[13px] font-bold text-text-bone">{project?.name ?? '...'}</span>
            <span className="font-mono text-[9.5px] text-text-dim">
              workspace {workspaceName} · {members.length} member · {scopedCount} project-scoped
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2.5">
              <select
                value={fRole}
                onChange={(e) => setFRole(e.target.value)}
                className="border border-line-strong bg-panel px-2.5 py-1.5 font-mono text-[10px] text-text-bone outline-none focus-visible:border-signal"
              >
                {['Semua', 'ADMIN WORKSPACE', 'DIVISION VIEWER', 'PROJECT MANAGER', 'EDITOR', 'APPROVER', 'VIEWER'].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <select
                value={fScope}
                onChange={(e) => setFScope(e.target.value)}
                className="border border-line-strong bg-panel px-2.5 py-1.5 font-mono text-[10px] text-text-bone outline-none focus-visible:border-signal"
              >
                {['Semua', 'Project-scoped', 'Dari workspace'].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama atau email"
                className="w-[190px] border border-line-strong bg-panel px-2.5 py-1.5 font-mono text-[10px] text-text-bone outline-none focus-visible:border-signal"
              />
            </div>
          </div>

          <div className="border border-line-strong bg-input-bg">
            <div className="grid grid-cols-[minmax(220px,2.4fr)_1.1fr_1.3fr_0.8fr_0.9fr] gap-3.5 border-b border-line px-4 py-2.5">
              {['MEMBER', 'ROLE DI PROJECT', 'LINGKUP', 'STATUS', 'AKSI'].map((h) => (
                <span key={h} className="whitespace-nowrap font-mono text-[8.5px] tracking-[0.14em] text-text-dim">
                  {h}
                </span>
              ))}
            </div>
            {rows.map((member) => (
              <ProjectMemberRow key={member.user_id} member={member} onManage={() => setManageTarget(member)} />
            ))}
            {rows.length === 0 && (
              <p className="p-9 text-center font-mono text-[10.5px] leading-relaxed text-text-dim">
                Tidak ada member yang cocok.
                <br />
                Tambahkan lewat tombol <span className="text-signal">+ MEMBER</span> -- Project Manager dapat memberi role Editor, Approver, atau Viewer pada lingkup project ini.
              </p>
            )}
          </div>
        </>
      )}

      <AddMemberModal projectId={id} open={addOpen} onClose={() => setAddOpen(false)} />
      <ManageProjectMemberPanel projectId={id} projectName={project?.name ?? '...'} target={manageTarget} onClose={() => setManageTarget(null)} />
    </div>
  )
}

const ROLE_COLOR: Record<string, string> = {
  admin_workspace: 'text-signal',
  division_viewer: 'text-text-muted',
  project_manager: 'text-blue',
  editor: 'text-mint',
  approver: 'text-violet',
  viewer: 'text-text-muted',
}

const LOCKED_TAG: Record<string, string> = {
  project_manager: 'PIC PROJECT',
  admin_workspace: 'ADMIN WORKSPACE',
  division_viewer: 'DIVISION VIEWER',
}

const LOCKED_NOTE: Record<string, string> = {
  project_manager: 'PIC project',
  admin_workspace: 'akses penuh seluruh project workspace',
  division_viewer: 'akses lihat lintas project workspace',
}

// locked (desain "PM Member Project.dc.html": PM/Admin Workspace = "—
// KUNCI", diperluas IG-100 mencakup Division Viewer -- lihat
// ProjectMemberRepository.ListMembersView) -- role di luar 3
// project_scoped_role (editor/approver/viewer) TIDAK PERNAH punya baris
// project_members asli, tidak bisa diedit/dihapus lewat panel Kelola
// member biasa dari halaman project-scoped ini (dikelola dari halaman
// lain -- WorkspaceMembersPage untuk AW/DV, ManageOrganizationModal
// untuk PM).
function ProjectMemberRow({ member, onManage }: { member: ProjectMember; onManage: () => void }) {
  const locked = !PROJECT_SCOPED_ROLES.some((r) => r.key === member.role)
  const initials = (member.display_name || member.email)
    .split(/[\s.@]+/)
    .map((w) => w[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="grid grid-cols-[minmax(220px,2.4fr)_1.1fr_1.3fr_0.8fr_0.9fr] items-center gap-3.5 border-t border-line px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center bg-signal font-mono text-[10px] font-bold text-bg-deep">
          {initials}
        </span>
        <div className="min-w-0 leading-[1.35]">
          <div className="truncate text-[12.5px] font-semibold text-text-bone">
            {member.display_name || member.email}
            {locked && <span className="ml-1.5 font-mono text-[8.5px] tracking-[0.1em] text-blue">{LOCKED_TAG[member.role] ?? '—'}</span>}
          </div>
          <div className="truncate font-mono text-[9.5px] text-text-dim">{member.email}</div>
        </div>
      </div>
      <span className={cn('font-mono text-[10px] font-semibold uppercase tracking-[0.04em]', ROLE_COLOR[member.role] ?? 'text-text-muted')}>
        {member.role}
      </span>
      <div className="min-w-0 leading-[1.45]">
        <div className={cn('whitespace-nowrap font-mono text-[9px] tracking-[0.1em]', member.is_scoped ? 'text-amber' : 'text-text-muted')}>
          {member.is_scoped ? 'PROJECT-SCOPED' : 'DARI WORKSPACE'}
        </div>
        <div className="truncate font-mono text-[9px] text-text-dim">
          {locked ? (LOCKED_NOTE[member.role] ?? '—') : member.is_scoped ? 'ditambahkan PM' : 'ikut role workspace'}
        </div>
      </div>
      <span className="font-mono text-[9.5px] tracking-[0.08em] text-mint">AKTIF</span>
      {locked ? (
        <span className="justify-self-end font-mono text-[9.5px] tracking-[0.08em] text-text-dim">— KUNCI</span>
      ) : (
        <button onClick={onManage} className="justify-self-end font-mono text-[9.5px] tracking-[0.08em] text-text-muted hover:text-signal">
          ✎ KELOLA
        </button>
      )}
    </div>
  )
}

export default function ProjectMembersPage() {
  return (
    <ErrorBoundary>
      <ProjectMembersPageContent />
    </ErrorBoundary>
  )
}
