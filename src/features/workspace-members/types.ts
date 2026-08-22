export interface WorkspaceMember {
  user_id: string
  email: string
  display_name: string
  role: string
  joined_at: string
}

// admin_workspace SENGAJA tidak masuk daftar assignable -- per desain (AW
// Members Roles.dc.html), Admin Workspace tidak boleh memberi/mencabut
// role admin_workspace, itu wewenang Group Admin. Baris member yang sudah
// admin_workspace juga di-lock total di halaman ini (lihat WorkspaceMembersPage).
export const ASSIGNABLE_ROLES: { key: string; label: string; description: string }[] = [
  { key: 'project_manager', label: 'PROJECT MANAGER', description: 'Mengelola sprint, task dependencies, dan member project.' },
  { key: 'editor', label: 'EDITOR', description: 'Membuat dan mengedit task, komentar, dan lampiran.' },
  { key: 'approver', label: 'APPROVER', description: 'Menyetujui atau menolak entri waktu dan task tertentu.' },
  { key: 'viewer', label: 'VIEWER', description: 'Akses lihat saja, tidak dapat mengubah data.' },
]
