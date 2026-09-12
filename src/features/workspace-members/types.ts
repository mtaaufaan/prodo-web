export interface WorkspaceMember {
  user_id: string
  email: string
  display_name: string
  title: string | null
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

// S2-16..24, US-006.
export interface PendingInvitation {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
}

export interface CreateInvitationsResult {
  invitation_ids: string[]
  added_directly: string[] | null
  errors: Record<string, string>
}

// S4W-02 (desain "AW Invite Member.dc.html", pool "MEMBER TERDAFTAR DI
// LUAR WORKSPACE INI") -- member organisasi pemilik workspace ini yang
// belum jadi member workspace ini.
export interface WorkspaceMemberCandidate {
  user_id: string
  email: string
  display_name: string
}

// S4W-02 (desain "AW Members Roles.dc.html") -- baris gabungan member
// aktif + undangan pending untuk satu grid, sesuai desain (bukan dua
// tabel terpisah seperti versi minimal S2/S3).
export type MemberOrInvitation =
  | { kind: 'member'; data: WorkspaceMember }
  | { kind: 'invitation'; data: PendingInvitation }
