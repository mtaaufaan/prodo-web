import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'

import WorkspaceSwitcher from '@/components/WorkspaceSwitcher'
import { useWorkspace } from '@/features/workspaces/hooks'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

// Kerangka aplikasi untuk role di dalam workspace (Admin Workspace, Project
// Manager, Editor, Approver, Viewer) -- diekstrak dari desain "Master UI
// User.dc.html" (dibaca via DesignSync), dibangun 2026-08-30 karena 5
// halaman member/workspace (Organization/Workspace/Members/CrossOrg/
// ProjectMembers) sudah berjalan tanpa shell sama sekali sebelum ini.
//
// Disederhanakan dari desain, sama pola PlatformAdminLayout: SATU sidebar
// (bukan icon-rail + sidebar konteks terpisah), TANPA search bar/notifikasi/
// CTA topbar (belum ada fitur nyata di baliknya). Role-switcher dropdown
// desain (`rolePickerVisible`) SENGAJA tidak dibangun -- itu alat demo
// desainer untuk preview, bukan fitur produk (dikonfirmasi user); role
// sesungguhnya berasal dari sesi login, bukan dropdown. Item nav untuk
// role/menu yang halamannya belum ada (Sprint, Board, Editor/Approver/
// Viewer, dst.) ditampilkan "SEGERA", bukan dibangun penuh -- tidak ada
// konsep "role aktif di workspace ini" di FE (lihat RoleGuard.tsx), jadi
// nav yang ditampilkan sama untuk semua role dulu, bukan difilter per role.
// to: null berarti belum ada halaman ("SEGERA"). Path ABSOLUT (bukan
// relatif) -- route anak WorkspaceLayout dideklarasikan sebagai path penuh
// /workspaces/:wsId/... di AppRouter, bukan sub-path relatif terhadap
// prefix bersama, jadi `to` relatif akan salah resolve begitu ada segmen
// path lain (mis. /workspaces/:wsId/projects/:id nanti).
function navItems(workspaceId: string): { icon: string; label: string; to: string | null }[] {
  return [
    { icon: '▤', label: 'Project', to: `/workspaces/${workspaceId}/projects` },
    { icon: '◉', label: 'Members & Roles', to: `/workspaces/${workspaceId}/members` },
    { icon: '◎', label: 'Performance Dashboard', to: null },
    { icon: '◫', label: 'Custom Status', to: null },
    { icon: '⌗', label: 'Rule Automation', to: null },
    { icon: '⇄', label: 'Webhook', to: null },
    { icon: '▧', label: 'Dokumen & Lampiran', to: null },
    { icon: '☰', label: 'Audit Trail Workspace', to: null },
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
  const clearSession = useAuthStore((state) => state.clearSession)
  const { data: workspace } = useWorkspace(workspaceId)

  const handleSignOut = () => {
    clearSession()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg-deep p-10 text-text-body">
      <div className="mx-auto mb-5 flex max-w-[1540px] flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.14em] text-text-muted">WORKSPACE</p>
          <h1 className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-text-bone">
            {workspace?.name ?? '...'}
          </h1>
        </div>
        <WorkspaceSwitcher activeWorkspaceId={workspaceId} />
      </div>

      <div className="mx-auto flex max-w-[1540px] overflow-hidden border border-line bg-bg-deep">
        <aside className="flex w-56 flex-shrink-0 flex-col border-r border-line">
          <nav className="flex flex-col gap-0.5 p-2">
            {navItems(workspaceId).map((item) => (
              <WorkspaceNavItem key={item.label} {...item} />
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
