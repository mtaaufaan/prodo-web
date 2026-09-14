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
// role admin_workspace LEWAT PANEL INI (ubah role member existing). Baris
// member yang sudah admin_workspace juga di-lock total di halaman ini
// (lihat WorkspaceMembersPage). Guard ini TIDAK berubah oleh role
// restructuring 2026-09-14 -- yang dibuka user cuma endpoint UNDANG (lihat
// AW_INVITE_ROLES), bukan ubah-role member yang sudah ada.
export const ASSIGNABLE_ROLES: { key: string; label: string; description: string }[] = [
  { key: 'project_manager', label: 'PROJECT MANAGER', description: 'Mengelola sprint, task dependencies, dan member project.' },
  { key: 'editor', label: 'EDITOR', description: 'Membuat dan mengedit task, komentar, dan lampiran.' },
  { key: 'approver', label: 'APPROVER', description: 'Menyetujui atau menolak entri waktu dan task tertentu.' },
  { key: 'viewer', label: 'VIEWER', description: 'Akses lihat saja, tidak dapat mengubah data.' },
]

// AW_INVITE_ROLES (role restructuring 2026-09-14, dikonfirmasi user) --
// role yang bisa DIUNDANG lewat AW Members & Roles: admin_workspace/
// division_viewer workspace-scoped (project TIDAK relevan, requiresProject
// false); project_manager/editor/approver/viewer project-scoped (WAJIB
// pilih project, requiresProject true) -- beda dari ASSIGNABLE_ROLES di
// atas yang khusus ubah-role member existing (tidak berubah).
export const AW_INVITE_ROLES: { key: string; label: string; description: string; requiresProject: boolean }[] = [
  { key: 'admin_workspace', label: 'ADMIN WORKSPACE', description: 'Kelola penuh workspace ini (member, project, pengaturan).', requiresProject: false },
  { key: 'division_viewer', label: 'DIVISION VIEWER', description: 'Akses lihat saja lintas project dalam workspace ini.', requiresProject: false },
  { key: 'project_manager', label: 'PROJECT MANAGER', description: 'Mengelola sprint, task dependencies, dan member project terpilih.', requiresProject: true },
  { key: 'editor', label: 'EDITOR', description: 'Membuat dan mengedit task, komentar, dan lampiran pada project terpilih.', requiresProject: true },
  { key: 'approver', label: 'APPROVER', description: 'Menyetujui atau menolak entri waktu dan task pada project terpilih.', requiresProject: true },
  { key: 'viewer', label: 'VIEWER', description: 'Akses lihat saja pada project terpilih, tidak dapat mengubah data.', requiresProject: true },
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
