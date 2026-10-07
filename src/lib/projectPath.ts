// Switcher project PM -- URL halaman project-scoped adalah sumber kebenaran
// project aktif ("/workspaces/:ws/projects/:projectId/<halaman>").

// projectIdFromPath -- id project di URL, atau null kalau bukan halaman project.
export function projectIdFromPath(pathname: string, workspaceId: string): string | null {
  const m = new RegExp(`^/workspaces/${workspaceId}/projects/([^/]+)`).exec(pathname)
  return m ? m[1] : null
}

// switchProjectPath -- URL halaman yang sedang dibuka untuk project baru (sisa
// path dan query dipertahankan); null kalau halaman sekarang bukan halaman
// project (tidak perlu pindah halaman).
export function switchProjectPath(pathname: string, search: string, workspaceId: string, newProjectId: string): string | null {
  const m = new RegExp(`^/workspaces/${workspaceId}/projects/[^/]+(/.*)?$`).exec(pathname)
  return m ? `/workspaces/${workspaceId}/projects/${newProjectId}${m[1] ?? ''}${search}` : null
}
