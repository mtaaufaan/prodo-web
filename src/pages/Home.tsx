import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useMyContext } from '@/features/context/hooks'
import { useAuthStore } from '@/store/useAuthStore'

// landingViewFor -- admin_workspace DAN project_manager mendarat ke
// Performance Dashboard (2026-09-22 utk AW; susulan untuk PM setelah user
// menemukan lewat pengujian live: PM landing ke /projects, halaman yang
// menurut desainnya sendiri "AW Projects.dc.html" -- PM malah tidak
// pernah punya link ke sana di nav PM sendiri, lihat WorkspaceLayout.
// pmNavItems). Role lain (editor/approver/viewer/division_viewer) tetap
// ke /projects seperti semula -- nav mereka (awNavItems, item 'project'
// bukan adminOnly) memang menyertakannya.
function landingViewFor(role: string) {
  return role === 'admin_workspace' || role === 'project_manager' ? 'performance' : 'projects'
}

// Placeholder landing setelah login (S1-22/25) -- dashboard sungguhan belum
// dibangun (menyusul sprint berikutnya per PRD §2.3+). group_admin dialihkan
// ke /summary saat login (Login.tsx), jadi halaman ini pada praktiknya cuma
// didarati role workspace murni (admin_workspace/PM/editor/dst) -- role
// mereka TIDAK ada di platform_role, cuma di workspace_memberships
// (GET /me/context). Sebelumnya halaman ini betul-betul jalan buntu: tidak
// ada link ke workspace mana pun -- WorkspaceSwitcher yang sudah bisa
// menampilkan daftar itu cuma dirender DI DALAM WorkspaceLayout, yang
// sendiri butuh :wsId di URL untuk mount. Ditemukan user 2026-09-13 saat
// login sungguhan pakai akun admin_workspace (implementation_gaps.md
// IG-68). Fix: auto-redirect kalau cuma 1 workspace, tampilkan daftar
// pilih kalau lebih dari 1, pesan jelas kalau 0.
export default function Home() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const ctx = useMyContext()
  const memberships = useMemo(() => ctx.data?.workspace_memberships ?? [], [ctx.data])
  // projectScoped (susulan, ditemukan user: project-scoped member --
  // TANPA workspace_memberships sama sekali -- landing di sini jadi jalan
  // buntu "belum jadi anggota workspace mana pun", padahal dia py project.
  // Fallback: kalau memberships kosong, arahkan/tampilkan pilihan dari
  // sini, LANGSUNG ke board project (bukan workspace) -- workspace
  // tinggal menyesuaikan dari project yang dipilih (dikonfirmasi user).
  const projectScoped = useMemo(() => ctx.data?.project_scoped_projects ?? [], [ctx.data])

  useEffect(() => {
    if (memberships.length === 1) {
      const m = memberships[0]
      navigate(`/workspaces/${m.workspace_id}/${landingViewFor(m.role)}`, { replace: true })
    } else if (memberships.length === 0 && projectScoped.length === 1) {
      const p = projectScoped[0]
      navigate(`/workspaces/${p.workspace_id}/projects/${p.project_id}/board`, { replace: true })
    }
  }, [memberships, projectScoped, navigate])

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  if (ctx.isLoading || memberships.length === 1 || (memberships.length === 0 && projectScoped.length === 1)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-deep p-6">
        <p className="text-sm text-text-muted">Memuat...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-deep p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-primary">Selamat datang, {user?.display_name}</h1>

        {ctx.data?.ga_console_enabled && (
          <div className="mt-4">
            <Link to="/organizations">
              <Button className="font-mono text-[11px] uppercase tracking-[0.08em]">Buka Konsol Group Admin</Button>
            </Link>
          </div>
        )}

        {memberships.length === 0 && projectScoped.length === 0 && !ctx.data?.ga_console_enabled && (
          <p className="mt-2 text-muted-foreground">Anda belum menjadi anggota workspace mana pun. Hubungi admin organisasi Anda.</p>
        )}

        {memberships.length === 0 && projectScoped.length > 1 && (
          <div className="mt-4 flex flex-col gap-2 text-left">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Pilih Project</p>
            {projectScoped.map((p) => (
              <button
                key={p.project_id}
                type="button"
                onClick={() => navigate(`/workspaces/${p.workspace_id}/projects/${p.project_id}/board`)}
                className="flex items-center justify-between border border-line px-3.5 py-2.5 text-left hover:border-line-strong"
              >
                <div className="min-w-0">
                  <div className="truncate text-[9.5px] text-text-muted">
                    {p.org_name} · {p.workspace_name}
                  </div>
                  <div className="truncate text-[13px] text-text-bone">{p.project_name}</div>
                </div>
                <span className="ml-3 flex-shrink-0 font-mono text-[9px] text-text-dim">
                  {p.role.toUpperCase().replace(/_/g, ' ')}
                </span>
              </button>
            ))}
          </div>
        )}

        {memberships.length > 1 && (
          <div className="mt-4 flex flex-col gap-2 text-left">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Pilih Workspace</p>
            {memberships.map((w) => (
              <button
                key={w.workspace_id}
                type="button"
                onClick={() => navigate(`/workspaces/${w.workspace_id}/${landingViewFor(w.role)}`)}
                className="flex items-center justify-between border border-line px-3.5 py-2.5 text-left hover:border-line-strong"
              >
                <div className="min-w-0">
                  <div className="truncate text-[9.5px] text-text-muted">{w.org_name}</div>
                  <div className="truncate text-[13px] text-text-bone">{w.name}</div>
                </div>
                <span className="ml-3 flex-shrink-0 font-mono text-[9px] text-text-dim">
                  {w.role.toUpperCase().replace(/_/g, ' ')}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-center gap-3">
          <Link to="/settings/sessions">
            <Button variant="outline" className="font-mono text-[11px] uppercase tracking-[0.08em]">
              Sesi & Perangkat
            </Button>
          </Link>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="font-mono text-[11px] uppercase tracking-[0.08em]"
          >
            Keluar
          </Button>
        </div>
      </div>
    </div>
  )
}
