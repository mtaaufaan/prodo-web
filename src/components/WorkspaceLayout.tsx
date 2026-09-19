import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'

import { useMyContext, useSwitchContext } from '@/features/context/hooks'
import { useWorkspace } from '@/features/workspaces/hooks'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

// Kerangka aplikasi untuk role di dalam workspace (Admin Workspace, Project
// Manager, Editor, Approver, Viewer) -- dari desain "Master UI User.dc.html".
//
// Dibangun ulang 2026-09-13 (sama alasan GroupAdminLayout dibangun ulang
// 2026-08-31): versi awal (2026-08-30) SATU sidebar sederhana, TERLALU
// disederhanakan dibanding sumber desain -- dikonfirmasi user "master frame
// yang digunakan sama dengan role GA, hanya saja menunya berbeda" setelah
// login sungguhan pakai akun admin_workspace pertama kali (implementation_
// gaps.md IG-68 -- gap TERPISAH, jalan buntu Home.tsx, sudah ditutup
// sebelum ini). Sekarang mengikuti struktur PERSIS GroupAdminLayout.tsx:
// icon rail + sidebar konteks (switcher workspace inline, bukan komponen
// WorkspaceSwitcher terpisah lagi -- dihapus, cuma dipakai di sini) +
// topbar (breadcrumb, notif disabled, CTA per-menu) + baris tab opsional.
// Input pencarian topbar (versi disabled, sama pola GroupAdminLayout)
// SENGAJA dihapus lagi (dikonfirmasi user 2026-09-13, sama instruksi
// dengan penghapusan search bebas WorkspaceListPage) -- tab status/filter
// yang sudah ada di tiap halaman workspace dianggap cukup.
//
// Cakupan menu SENGAJA belum penuh sesuai desain (dikonfirmasi user): 9
// item Admin Workspace di desain, di sini masih 8 (Cooldown Mention belum
// ada halamannya, menyusul S4W-07/08) -- item nav 4 role LAIN (Project
// Manager/Editor/Approver/Viewer) di desain PUNYA menu yang SAMA SEKALI
// beda (Sprint/Board/Timesheet/dst, Track terpisah yang jauh lebih besar,
// di luar cakupan Track S4W yang disepakati) -- TIDAK dibangun, filter
// admin-only (S4W-00) tetap satu-satunya pembeda nav per role untuk saat
// ini. Tabs topbar CUMA didaftarkan untuk 'project' (Semua/Aktif/Arsip,
// migrasi dari filter inline ProjectListPage) -- 'members' SENGAJA TIDAK
// (WorkspaceMembersPage S4W-02 sudah punya panel filter Project+Role+
// paginasi sendiri yang lebih detail dari 7 tab status/role polos di
// desain, duplikasi jadi kontra-produktif).
export interface WorkspaceOutletContext {
  view: string
  registerCta: (handler: (() => void) | null) => void
}

interface WorkspaceNavItemDef {
  key: string
  icon: string
  label: string
  to: string | null
  tabs: string[] | null
  cta: string | null
  adminOnly?: boolean
}

// to: null berarti belum ada halaman ("SEGERA"). Path ABSOLUT (bukan
// relatif) -- route anak WorkspaceLayout dideklarasikan sebagai path penuh
// /workspaces/:wsId/... di AppRouter (lihat komentar lama, masih berlaku).
function navItems(workspaceId: string): WorkspaceNavItemDef[] {
  return [
    { key: 'project', icon: '▤', label: 'Project', to: `/workspaces/${workspaceId}/projects`, tabs: ['Semua', 'Aktif', 'Arsip'], cta: '+ Project' },
    { key: 'members', icon: '◉', label: 'Members & Roles', to: `/workspaces/${workspaceId}/members`, tabs: null, cta: '+ Undang Member' },
    { key: 'kinerja', icon: '◎', label: 'Performance Dashboard', to: null, tabs: null, cta: null },
    {
      key: 'cooldown',
      icon: '◷',
      label: 'Cooldown Mention',
      to: `/workspaces/${workspaceId}/cooldown-mention`,
      tabs: null,
      cta: null,
      adminOnly: true,
    },
    {
      key: 'status',
      icon: '◫',
      label: 'Custom Status',
      to: `/workspaces/${workspaceId}/statuses`,
      tabs: ['Semua', 'Sistem', 'Kustom', 'Per Project'],
      cta: '+ Tambah Status',
      adminOnly: true,
    },
    {
      key: 'rule',
      icon: '⌗',
      label: 'Rule Automation',
      to: `/workspaces/${workspaceId}/rules`,
      tabs: ['Rule Aktif', 'Template Library', 'Log Eksekusi'],
      cta: '+ Rule',
      adminOnly: true,
    },
    {
      key: 'webhook',
      icon: '⇄',
      label: 'Webhook',
      to: `/workspaces/${workspaceId}/webhooks`,
      tabs: ['Endpoint', 'Log Pengiriman'],
      cta: '+ Webhook',
      adminOnly: true,
    },
    {
      key: 'docs',
      icon: '▧',
      label: 'Dokumen & Lampiran',
      to: `/workspaces/${workspaceId}/documents`,
      tabs: null,
      cta: null,
      adminOnly: true,
    },
    { key: 'audit', icon: '☰', label: 'Audit Trail Workspace', to: null, tabs: null, cta: null, adminOnly: true },
  ]
}

function WorkspaceNavItem({ icon, label, to }: { icon: string; label: string; to: string | null }) {
  if (!to) {
    return (
      <div className="flex cursor-not-allowed items-center gap-2.5 border-l-2 border-transparent px-3 py-2.5 text-[12.5px] text-text-dim">
        <span className="w-4 font-mono text-[11px]">{icon}</span>
        {label}
        <span className="ml-auto font-mono text-[9px] tracking-[0.08em]">SEGERA</span>
      </div>
    )
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 border-l-2 px-3 py-2.5 text-[12.5px]',
          isActive ? 'border-signal bg-bg-deep text-text-bone' : 'border-transparent text-text-muted hover:text-text-bone',
        )
      }
    >
      <span className="w-4 font-mono text-[11px]">{icon}</span>
      {label}
    </NavLink>
  )
}

export default function WorkspaceLayout() {
  const { wsId } = useParams<{ wsId: string }>()
  const workspaceId = wsId ?? ''
  const navigate = useNavigate()
  const location = useLocation()
  const clearSession = useAuthStore((state) => state.clearSession)
  const user = useAuthStore((state) => state.user)
  const { data: workspace } = useWorkspace(workspaceId)
  const myContext = useMyContext()
  const switchContext = useSwitchContext()
  const { i18n } = useTranslation()

  const [view, setView] = useState('Semua')
  const [ctaHandler, setCtaHandler] = useState<(() => void) | null>(null)
  const registerCta = useCallback((handler: (() => void) | null) => setCtaHandler(() => handler), [])
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [wsMenuOpen, setWsMenuOpen] = useState(false)

  const items = useMemo(() => navItems(workspaceId), [workspaceId])
  const activeNav = useMemo(() => items.find((n) => n.to && location.pathname.startsWith(n.to)) ?? null, [items, location.pathname])

  // canSeeAdminItems (S4W-00): platform_admin/group_admin yang sedang
  // context-switch ke workspace ini SELALU bypass (mereka bisa tidak
  // punya baris workspace_members sama sekali di sini -- akses org-level,
  // bukan keanggotaan langsung), sama seperti middleware.RequireRole
  // backend yang tidak pernah menolak mereka. Default false selama
  // context belum termuat -- item admin-only tersembunyi sesaat alih-alih
  // sempat terlihat lalu hilang untuk viewer yang bukan admin.
  const platformRole = myContext.data?.platform_role
  const workspaceMemberships = myContext.data?.workspace_memberships ?? []
  const myWorkspaceRole = workspaceMemberships.find((w) => w.workspace_id === workspaceId)?.role
  const canSeeAdminItems =
    platformRole === 'platform_admin' || platformRole === 'group_admin' || myWorkspaceRole === 'admin_workspace'
  const gaConsoleEnabled = myContext.data?.ga_console_enabled ?? false
  // Switcher sidebar cuma perlu tampil kalau ada tempat lain untuk pindah --
  // GA yang cuma context-switch ke SATU workspace ini via bypass (tidak
  // literally jadi anggota mana pun) tidak dapat apa-apa dari membukanya.
  const wsSwitchable = gaConsoleEnabled || workspaceMemberships.length > 1

  const visibleItems = items.filter((item) => !item.adminOnly || canSeeAdminItems)

  const handleSignOut = () => {
    clearSession()
    navigate('/login')
  }
  const handleSwitchToGa = async () => {
    setWsMenuOpen(false)
    await switchContext.mutateAsync('ga_console')
    navigate('/organizations')
  }
  const handleSwitchWorkspace = async (targetId: string) => {
    setWsMenuOpen(false)
    if (targetId === workspaceId) return
    await switchContext.mutateAsync('workspace')
    navigate(`/workspaces/${targetId}/projects`)
  }

  const monogram = (user?.display_name ?? '')
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-bg-deep p-6 text-text-body">
      <div className="mx-auto flex h-[calc(100vh-48px)] max-w-[1540px] overflow-hidden border border-line bg-panel">
        {/* ICON RAIL */}
        <div className="flex w-[58px] flex-shrink-0 flex-col items-center gap-1.5 border-r border-line py-3.5">
          <div className="mb-2.5 flex h-[34px] w-[34px] items-center justify-center bg-signal text-[16px] font-black text-bg-deep">
            P
          </div>
          <button
            type="button"
            disabled
            title="Pencarian belum tersedia"
            className="flex h-[38px] w-[38px] cursor-not-allowed items-center justify-center border-l-2 border-transparent font-mono text-[15px] text-text-dim"
          >
            ⌕
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings/sessions')}
            title="Sesi & perangkat"
            className="flex h-[38px] w-[38px] items-center justify-center border-l-2 border-transparent font-mono text-[15px] text-text-dim hover:text-signal"
          >
            ⚙
          </button>
          <div className="mt-auto flex flex-col items-center gap-2.5">
            {gaConsoleEnabled && (
              <button
                type="button"
                onClick={handleSwitchToGa}
                title="Kembali ke Konsol Group Admin"
                className="flex h-[34px] w-[34px] items-center justify-center border border-line-strong text-[14px] text-text-muted hover:border-signal hover:text-signal"
              >
                ⚙
              </button>
            )}
            <div
              className="grid h-8 w-8 place-items-center rounded-full bg-violet font-mono text-[11px] font-bold text-bg-deep"
              title={user?.display_name ?? ''}
            >
              {monogram || '—'}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Keluar"
              className="flex h-[34px] w-[34px] items-center justify-center border border-line-strong text-[14px] text-text-muted hover:border-signal hover:text-signal"
            >
              ⏻
            </button>
          </div>
        </div>

        {/* CONTEXT SIDEBAR */}
        <aside className="relative flex w-60 flex-shrink-0 flex-col border-r border-line">
          <button
            type="button"
            onClick={() => wsSwitchable && setWsMenuOpen((v) => !v)}
            className={cn(
              'flex h-[58px] flex-shrink-0 items-center gap-2.5 border-b border-line px-3.5 text-left',
              wsSwitchable ? 'cursor-pointer' : 'cursor-default',
            )}
          >
            <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center bg-mint text-[14px] font-extrabold text-bg-deep">
              {(workspace?.name ?? '—').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate font-mono text-[8px] tracking-[0.14em] text-text-muted">WORKSPACE</div>
              <div className="truncate text-[14px] font-bold">{workspace?.name ?? '...'}</div>
            </div>
            {wsSwitchable && <span className="font-mono text-[10px] text-text-muted">{wsMenuOpen ? '▴' : '▾'}</span>}
          </button>

          {wsMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setWsMenuOpen(false)} />
              <div className="absolute left-2 right-2 top-[62px] z-20 border border-line-strong bg-bg-deep">
                <div className="border-b border-line px-3 py-2 font-mono text-[8.5px] tracking-[0.14em] text-text-muted">
                  PINDAH WORKSPACE · {workspaceMemberships.length} DITUGASKAN
                </div>
                {gaConsoleEnabled && (
                  <button
                    type="button"
                    onClick={handleSwitchToGa}
                    className="flex w-full items-center gap-2.5 border-b border-line bg-[oklch(0.225_0.02_45)] px-3 py-2.5 text-left"
                  >
                    <span className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center bg-signal text-[11px] text-bg-deep">
                      ⚙
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] text-text-bone">Konsol Group Admin</div>
                      <div className="truncate font-mono text-[8.5px] text-signal">KONTEKS GRUP</div>
                    </div>
                    <span className="font-mono text-[9px] text-text-muted">→</span>
                  </button>
                )}
                {workspaceMemberships.map((w) => {
                  const active = w.workspace_id === workspaceId
                  return (
                    <button
                      key={w.workspace_id}
                      type="button"
                      onClick={() => handleSwitchWorkspace(w.workspace_id)}
                      className={cn('flex w-full items-center gap-2.5 border-t border-line-subtle px-3 py-2.5 text-left', active && 'bg-raised-2')}
                    >
                      <span className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center bg-mint text-[10px] font-extrabold text-bg-deep">
                        {w.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-[8.5px] text-text-muted">{w.org_name}</div>
                        <div className="truncate text-[12.5px] text-text-bone">{w.name}</div>
                        <div className="font-mono text-[8px] text-text-dim">ROLE ANDA · {w.role.toUpperCase().replace(/_/g, ' ')}</div>
                      </div>
                      {active && <span className="font-mono text-[9px] text-mint">● AKTIF</span>}
                    </button>
                  )
                })}
                <p className="border-t border-line px-3 py-2 text-[9.5px] text-text-dim">
                  Perpindahan konteks tercatat di Audit Trail workspace.
                </p>
              </div>
            </>
          )}

          <div className="flex flex-1 flex-col gap-0.5 overflow-auto p-2">
            {visibleItems.map((item) => (
              <WorkspaceNavItem key={item.key} icon={item.icon} label={item.label} to={item.to} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setProfileMenuOpen((open) => !open)}
            className="flex flex-shrink-0 items-center gap-2.5 border-t border-line px-4 py-3 text-left hover:bg-bg-deep"
          >
            <span className="flex h-7 w-7 items-center justify-center border border-signal bg-[oklch(0.24_0.03_45)] font-mono text-[13px] text-signal">
              ◈
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[12.5px] font-semibold">{user?.display_name ?? '—'}</div>
              <div className="truncate font-mono text-[9px] text-text-muted">
                {(myWorkspaceRole ?? platformRole ?? '—').toUpperCase().replace(/_/g, ' ')}
              </div>
            </div>
            <span className="font-mono text-[11px] text-text-muted">{profileMenuOpen ? '▴' : '▾'}</span>
          </button>

          {profileMenuOpen && (
            <div className="absolute bottom-[60px] left-2.5 right-2.5 z-10 border border-line-strong bg-bg-deep p-1.5">
              <div className="px-2 pb-1 pt-1.5 font-mono text-[8.5px] tracking-[0.14em] text-text-muted">AKUN</div>
              <div className="flex items-center gap-2.5 p-2">
                <span className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-violet font-mono text-[9.5px] font-bold text-bg-deep">
                  {monogram || '—'}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[12px] text-text-bone">{user?.display_name ?? '—'}</div>
                  <div className="truncate font-mono text-[8.5px] text-text-muted">{user?.email ?? '—'}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false)
                  navigate('/settings/sessions')
                }}
                className="w-full border-t border-line p-2 text-left font-mono text-[11px] text-text-muted hover:text-signal"
              >
                ⚙ Sesi & perangkat
              </button>
              <div className="flex items-center gap-2 border-t border-line p-2">
                <span className="font-mono text-[11px] text-text-muted">Bahasa</span>
                <div className="ml-auto flex gap-1.5">
                  {(['id', 'en'] as const).map((lng) => (
                    <button
                      key={lng}
                      type="button"
                      onClick={() => i18n.changeLanguage(lng)}
                      className={cn(
                        'border px-2.5 py-1 font-mono text-[9.5px] tracking-[0.08em]',
                        (i18n.language?.startsWith('en') ? 'en' : 'id') === lng
                          ? 'border-signal bg-signal text-bg-deep'
                          : 'border-line text-text-muted',
                      )}
                    >
                      {lng.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[58px] flex-shrink-0 items-center gap-4 border-b border-line px-5">
            <div className="flex items-center gap-2 font-mono text-[11px] text-text-muted">
              <span>{workspace?.name ?? '...'}</span>
              <span className="text-text-faint">/</span>
              <span className="text-text-bone">{activeNav?.label ?? '—'}</span>
            </div>
            <div className="flex-1" />
            <button
              type="button"
              disabled
              title="Notifikasi belum tersedia"
              className="flex h-[34px] w-[34px] flex-shrink-0 cursor-not-allowed items-center justify-center border border-line text-[14px] text-text-dim"
            >
              🔔
            </button>
            {activeNav?.cta && ctaHandler && (
              <button
                type="button"
                onClick={ctaHandler}
                className="flex-shrink-0 whitespace-nowrap bg-signal px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-bg-deep"
              >
                {activeNav.cta}
              </button>
            )}
          </div>

          {activeNav?.tabs && (
            <div className="flex h-[46px] flex-shrink-0 items-stretch gap-0.5 border-b border-line px-3.5">
              {activeNav.tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setView(tab)}
                  className={cn(
                    'flex items-center border-b-2 px-3.5 font-mono text-[11px] tracking-[0.04em]',
                    view === tab ? 'border-signal text-text-bone' : 'border-transparent text-text-muted',
                  )}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto bg-content">
            <Outlet context={{ view, registerCta } satisfies WorkspaceOutletContext} />
          </div>
        </main>
      </div>
    </div>
  )
}
