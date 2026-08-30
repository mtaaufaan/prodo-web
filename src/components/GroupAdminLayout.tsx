import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

// Kerangka konsol Group Admin -- diekstrak dari desain "Master UI Group
// Admin.dc.html" (dibaca via DesignSync), dibangun 2026-08-30 (Track S4G,
// S4G-01). Disederhanakan sama pola PlatformAdminLayout/WorkspaceLayout:
// SATU sidebar (bukan icon-rail + sidebar konteks terpisah dari desain),
// TANPA search bar/notifikasi/CTA topbar.
//
// Route yang dibungkus (/organizations, /organizations/:orgId/workspaces,
// /groups/:groupId/cross-org-memberships) DIPAKAI BERSAMA Platform Admin
// (RoleGuard allowedRoles=['platform_admin','group_admin']) -- PA punya
// konsol sendiri (PlatformAdminLayout di /platform/*), jadi shell GA
// SENGAJA tidak dipaksakan ke PA: kalau viewer platform_admin, render
// children polos (persis perilaku sebelum S4G-01), shell cuma tampil
// untuk group_admin. Menghindari duplikasi route untuk data yang sama.
function useNavItems() {
  return [
    { icon: '◧', label: 'Ringkasan', to: null },
    { icon: '▤', label: 'Organisasi', to: '/organizations' },
    { icon: '◫', label: 'Workspace', to: null },
    { icon: '▦', label: 'Storage & Kuota', to: null },
    { icon: '◉', label: 'Members & Roles', to: null },
    { icon: '◷', label: 'Data Retention', to: null },
    { icon: '⬇', label: 'Import Data', to: null },
    { icon: '⌗', label: 'Webhook', to: null },
    { icon: '🌐', label: 'Bahasa & Lokal', to: null },
    { icon: '☰', label: 'Audit Trail', to: null },
    { icon: '◎', label: 'Kinerja Grup', to: null },
  ]
}

function GroupAdminNavItem({ icon, label, to }: { icon: string; label: string; to: string | null }) {
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

export default function GroupAdminLayout() {
  const navigate = useNavigate()
  const platformRole = useAuthStore((state) => state.user?.platform_role)
  const clearSession = useAuthStore((state) => state.clearSession)
  const navItems = useNavItems()

  if (platformRole === 'platform_admin') {
    return <Outlet />
  }

  const handleSignOut = () => {
    clearSession()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg-deep p-10 text-text-body">
      <div className="mx-auto mb-5 max-w-[1540px]">
        <p className="font-mono text-[10px] tracking-[0.14em] text-text-muted">GRUP</p>
        <h1 className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-text-bone">Konsol Group Admin</h1>
      </div>

      <div className="mx-auto flex max-w-[1540px] overflow-hidden border border-line bg-bg-deep">
        <aside className="flex w-56 flex-shrink-0 flex-col border-r border-line">
          <nav className="flex flex-col gap-0.5 p-2">
            {navItems.map((item) => (
              <GroupAdminNavItem key={item.label} {...item} />
            ))}
          </nav>
          <div className="mt-auto flex justify-end border-t border-line p-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 border border-line px-3.5 py-2 font-mono text-[11px] tracking-[0.06em] text-signal"
            >
              Keluar ⏻
            </button>
          </div>
        </aside>
        <main className="min-h-[600px] flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
