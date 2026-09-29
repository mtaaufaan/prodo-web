// UserContext -- GET /me/context (S16-01/02, forward-pull Track S4G):
// switcher dual-role GA. active_context "ga_console" | "workspace",
// diadaptasi ke Redis di backend (BUKAN klaim JWT literal -- lihat
// komentar backend service/context.go), FE cukup pakai nilainya apa
// adanya tanpa perlu tahu detail penyimpanannya.
export interface WorkspaceMembership {
  workspace_id: string
  name: string
  org_name: string
  role: string
}

// ProjectScopedProject (susulan, ditemukan user: project-scoped member --
// TANPA baris workspace_members -- tidak pernah muncul di
// workspace_memberships, bikin Home.tsx/WorkspaceLayout dead-end buat
// mereka) -- daftar TERPISAH, SENGAJA TIDAK menyalakan switcher
// multi-workspace, cuma dipakai landing (Home.tsx) dan fallback resolusi
// role (WorkspaceLayout, dicocokkan ke project aktif di URL).
export interface ProjectScopedProject {
  project_id: string
  project_name: string
  workspace_id: string
  workspace_name: string
  org_name: string
  role: string
}

export interface UserContext {
  platform_role: string
  ga_console_enabled: boolean
  active_context: 'ga_console' | 'workspace'
  workspace_memberships: WorkspaceMembership[]
  project_scoped_projects: ProjectScopedProject[]
}
