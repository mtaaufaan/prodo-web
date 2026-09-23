import type { WorkspaceAuditLogEntry } from './types'

// formatWorkspaceAuditNarrative -- kalimat siap-baca + scope per baris,
// meniru gaya desain "AW Audit Trail.dc.html". Pola PERSIS
// features/group-audit/narrative.ts, TAPI target_name di sini TIDAK PERNAH
// berasal dari live JOIN entitas yang bisa hilang (lihat komentar
// WorkspaceAuditRepository) -- murni snapshot immutable, jadi kalimat ini
// aman ditampilkan bahkan untuk baris lama setelah entity aslinya dihapus.
//
// PENTING untuk pengembangan selanjutnya: setiap kali menambah action code
// BARU yang ditulis ke audit_logs (insertProjectAudit/insertRuleAudit/
// insertWebhookAudit/insertAttachmentAudit/insertCustomStatusAudit atau
// helper baru), tambahkan juga kasusnya di sini DAN di
// internal/handler/workspace_audit_narrative.go (backend, dipakai ekspor
// CSV) -- action yang tidak dikenali jatuh ke fallback generik (masih
// tampil, tidak error) supaya lupa menambah entri di salah satu tidak
// pernah membuat halaman/ekspor CSV rusak, cuma kurang komunikatif.
export interface AuditNarrative {
  text: string
  scope: string
}

function targetOf(entry: WorkspaceAuditLogEntry, fallback = 'tidak diketahui'): string {
  return entry.target_name ?? fallback
}

function metaString(entry: WorkspaceAuditLogEntry, key: string, fallback = 'tidak diketahui'): string {
  const v = entry.metadata?.[key]
  return typeof v === 'string' && v !== '' ? v : fallback
}

export function formatWorkspaceAuditNarrative(entry: WorkspaceAuditLogEntry): AuditNarrative {
  switch (entry.action) {
    case 'workspace.created':
      return { text: `Workspace "${targetOf(entry)}" dibuat`, scope: 'WORKSPACE' }
    case 'workspace.updated':
      return { text: `Workspace "${targetOf(entry)}" diperbarui`, scope: 'WORKSPACE' }
    case 'workspace.archived':
      return { text: `Workspace "${targetOf(entry)}" diarsipkan`, scope: 'WORKSPACE' }
    case 'workspace.unarchived':
      return { text: `Workspace "${targetOf(entry)}" dikeluarkan dari arsip`, scope: 'WORKSPACE' }
    case 'workspace.deactivated':
      return { text: `Workspace "${targetOf(entry)}" dinonaktifkan`, scope: 'WORKSPACE' }
    case 'workspace.reactivated':
      return { text: `Workspace "${targetOf(entry)}" diaktifkan kembali`, scope: 'WORKSPACE' }
    case 'workspace.deleted':
      return { text: `Workspace "${targetOf(entry)}" dihapus`, scope: 'WORKSPACE' }
    case 'workspace.restored':
      return { text: `Workspace "${targetOf(entry)}" dipulihkan`, scope: 'WORKSPACE' }
    case 'workspace.moved':
      return { text: `Workspace "${targetOf(entry)}" dipindahkan ke organisasi lain`, scope: 'WORKSPACE' }
    case 'workspace.mention_settings_updated':
      return { text: 'Pengaturan cooldown mention workspace diperbarui', scope: 'WORKSPACE' }
    case 'project.created':
      return { text: `Project "${targetOf(entry)}" dibuat`, scope: 'PROJECT' }
    case 'project.updated':
      return { text: `Project "${targetOf(entry)}" diperbarui`, scope: 'PROJECT' }
    case 'project.archived':
      return { text: `Project "${targetOf(entry)}" diarsipkan`, scope: 'PROJECT' }
    case 'project.unarchived':
      return { text: `Project "${targetOf(entry)}" dikeluarkan dari arsip`, scope: 'PROJECT' }
    case 'project.deleted':
      return { text: `Project "${targetOf(entry)}" dihapus`, scope: 'PROJECT' }
    case 'project.restored':
      return { text: `Project "${targetOf(entry)}" dipulihkan`, scope: 'PROJECT' }
    case 'project.pm_assigned':
      return { text: `Project Manager ditetapkan untuk project "${targetOf(entry)}"`, scope: 'PROJECT' }
    case 'project.pm_reassigned':
      return { text: `Project Manager project "${targetOf(entry)}" diganti`, scope: 'PROJECT' }
    case 'project.pm_removed':
      return { text: `Project Manager project "${targetOf(entry)}" dicabut`, scope: 'PROJECT' }
    case 'custom_status.created':
      return { text: `Status kustom "${targetOf(entry)}" dibuat`, scope: 'CUSTOM STATUS' }
    case 'custom_status.updated':
      return { text: `Status kustom "${targetOf(entry)}" diperbarui`, scope: 'CUSTOM STATUS' }
    case 'custom_status.reordered':
      return { text: 'Urutan status kustom diubah', scope: 'CUSTOM STATUS' }
    case 'custom_status.undefined':
      return { text: `Status kustom "${targetOf(entry)}" dinonaktifkan (undefine)`, scope: 'CUSTOM STATUS' }
    case 'custom_status.restored':
      return { text: `Status kustom "${targetOf(entry)}" dipulihkan`, scope: 'CUSTOM STATUS' }
    case 'custom_status.start_confirmation_changed':
      return { text: `Konfirmasi mulai pengerjaan status "${targetOf(entry)}" diubah`, scope: 'CUSTOM STATUS' }
    case 'rule.created':
      return { text: `Rule otomatisasi "${targetOf(entry)}" dibuat`, scope: 'RULE AUTOMATION' }
    case 'rule.deleted':
      return { text: `Rule otomatisasi "${targetOf(entry)}" dihapus`, scope: 'RULE AUTOMATION' }
    case 'rule.activated':
      return { text: `Rule otomatisasi "${targetOf(entry)}" diaktifkan`, scope: 'RULE AUTOMATION' }
    case 'rule.deactivated':
      return { text: `Rule otomatisasi "${targetOf(entry)}" dinonaktifkan`, scope: 'RULE AUTOMATION' }
    case 'rule.auto_deactivated':
      return { text: `Rule otomatisasi "${targetOf(entry)}" dinonaktifkan otomatis (status dihapus)`, scope: 'RULE AUTOMATION' }
    case 'webhook.created':
      return { text: `Webhook "${targetOf(entry)}" didaftarkan`, scope: 'WEBHOOK' }
    case 'webhook.updated':
      return { text: `Webhook "${targetOf(entry)}" diperbarui`, scope: 'WEBHOOK' }
    case 'webhook.activated':
      return { text: `Webhook "${targetOf(entry)}" diaktifkan`, scope: 'WEBHOOK' }
    case 'webhook.deactivated':
      return { text: `Webhook "${targetOf(entry)}" dinonaktifkan`, scope: 'WEBHOOK' }
    case 'webhook.secret_regenerated':
      return { text: `Secret webhook "${targetOf(entry)}" dibuat ulang`, scope: 'WEBHOOK' }
    case 'webhook.deleted':
      return { text: `Webhook "${targetOf(entry)}" dihapus`, scope: 'WEBHOOK' }
    case 'attachment.uploaded':
      return { text: `Lampiran "${targetOf(entry)}" diunggah`, scope: 'DOKUMEN & LAMPIRAN' }
    case 'attachment.renamed':
      return { text: `Lampiran diganti nama menjadi "${targetOf(entry)}"`, scope: 'DOKUMEN & LAMPIRAN' }
    case 'attachment.deleted':
      return { text: `Lampiran "${targetOf(entry)}" dihapus (masa retensi)`, scope: 'DOKUMEN & LAMPIRAN' }
    case 'attachment.deleted_permanent':
      return { text: `Lampiran "${targetOf(entry)}" dihapus permanen`, scope: 'DOKUMEN & LAMPIRAN' }
    case 'attachment.restored':
      return { text: `Lampiran "${targetOf(entry)}" dipulihkan`, scope: 'DOKUMEN & LAMPIRAN' }
    case 'attachment.quota_requested':
      return { text: 'Permintaan tambah kuota storage dikirim ke Group Admin', scope: 'DOKUMEN & LAMPIRAN' }
    case 'member.role_changed':
      return { text: `Role member "${targetOf(entry)}" diubah`, scope: 'MEMBERS & ROLES' }
    case 'member.removed':
      return { text: `Member "${targetOf(entry)}" dikeluarkan dari workspace`, scope: 'MEMBERS & ROLES' }
    case 'invitation.created':
      return { text: `Undangan workspace dibuat untuk "${metaString(entry, 'email', targetOf(entry))}"`, scope: 'MEMBERS & ROLES' }
    case 'invitation.cancelled':
      return { text: `Undangan workspace "${metaString(entry, 'email', targetOf(entry))}" dibatalkan`, scope: 'MEMBERS & ROLES' }
    case 'invitation.accepted':
      return { text: `Undangan workspace "${metaString(entry, 'email', targetOf(entry))}" diterima -- akun aktif`, scope: 'MEMBERS & ROLES' }
    case 'project_member.added':
      return { text: `Member "${targetOf(entry)}" ditambahkan ke project`, scope: 'MEMBER PROJECT' }
    case 'project_member.role_changed':
      return { text: `Role member project "${targetOf(entry)}" diubah`, scope: 'MEMBER PROJECT' }
    case 'project_member.removed':
      return { text: `Member "${targetOf(entry)}" dikeluarkan dari project`, scope: 'MEMBER PROJECT' }
    case 'sprint.created':
      return { text: `Sprint "${targetOf(entry)}" dibuat`, scope: 'SPRINT' }
    case 'sprint.updated':
      return { text: `Sprint "${targetOf(entry)}" diperbarui`, scope: 'SPRINT' }
    case 'sprint.started':
      return { text: `Sprint "${targetOf(entry)}" dimulai`, scope: 'SPRINT' }
    case 'sprint.completed':
      return { text: `Sprint "${targetOf(entry)}" ditutup`, scope: 'SPRINT' }
    case 'sprint.reopened':
      return { text: `Sprint "${targetOf(entry)}" dibuka kembali`, scope: 'SPRINT' }
    case 'sprint.tasks_assigned':
      return { text: `Task ditarik ke sprint "${targetOf(entry)}"`, scope: 'SPRINT' }
    case 'sprint.deleted':
      return { text: `Sprint "${targetOf(entry)}" dihapus`, scope: 'SPRINT' }
    case 'user.login':
      return { text: 'Login berhasil', scope: 'AKSES & KEAMANAN' }
    case 'user.backup_code_used':
      return { text: 'Login menggunakan kode cadangan MFA', scope: 'AKSES & KEAMANAN' }
    case 'account.profile_updated':
      return { text: 'Profil akun sendiri diperbarui', scope: 'AKSES & KEAMANAN' }
    case 'account.password_changed':
      return { text: 'Password akun sendiri diganti', scope: 'AKSES & KEAMANAN' }
    case 'account.mfa_device_reset':
      return { text: 'MFA dipindahkan ke perangkat baru', scope: 'AKSES & KEAMANAN' }
    case 'account.mfa_backup_codes_regenerated':
      return { text: 'Kode pemulihan MFA dibuat ulang', scope: 'AKSES & KEAMANAN' }
    case 'account.notification_preferences_updated':
      return { text: 'Preferensi notifikasi akun sendiri diperbarui', scope: 'AKSES & KEAMANAN' }
    default:
      return { text: `${entry.action} pada ${entry.entity_type}`, scope: entry.entity_type.toUpperCase() }
  }
}
