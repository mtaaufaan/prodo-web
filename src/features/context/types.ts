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

export interface UserContext {
  platform_role: string
  ga_console_enabled: boolean
  active_context: 'ga_console' | 'workspace'
  workspace_memberships: WorkspaceMembership[]
}
