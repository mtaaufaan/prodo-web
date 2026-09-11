import type { GroupAuditLogEntry } from './types'

// formatGroupAuditNarrative -- kalimat siap-baca + scope per baris, meniru
// gaya desain "GA Audit Trail.dc.html". Beda dari
// features/platform-admin/auditNarrative.ts: TIDAK pakai i18next (GA belum
// punya menu Bahasa & Lokal, sama pola halaman GA lain sesi ini), dan
// entity-nya organization/workspace/webhook (bukan user/tier).
//
// PENTING untuk pengembangan selanjutnya: setiap kali menambah action code
// BARU yang ditulis ke audit_logs (insertOrgAudit/insertWorkspaceAudit/
// insertWebhookAudit atau helper baru), tambahkan juga kasusnya di sini --
// action yang tidak dikenali jatuh ke fallback generik (masih tampil, tidak
// error, lihat default case) supaya lupa menambah entri di sini tidak
// pernah membuat halaman ini rusak.
export interface AuditNarrative {
  text: string
  scope: string
}

function targetOf(entry: GroupAuditLogEntry, fallback = 'tidak diketahui'): string {
  return entry.target_name ?? entry.org_name ?? fallback
}

// emailOf -- undangan (user_invitations) tidak resolve ke nama apa pun
// lewat JOIN (beda dari workspace/webhook), jadi email disimpan langsung
// di metadata saat audit ditulis (insertInvitationAudit/
// insertExecutiveInvitationAudit) supaya baris ini tetap bisa diidentifikasi.
function emailOf(entry: GroupAuditLogEntry): string {
  return typeof entry.metadata?.email === 'string' ? entry.metadata.email : 'tidak diketahui'
}

export function formatGroupAuditNarrative(entry: GroupAuditLogEntry): AuditNarrative {
  const org = entry.org_name ?? 'Seluruh grup'
  switch (entry.action) {
    case 'organization.created':
      return { text: `Organisasi "${targetOf(entry)}" dibuat`, scope: `ORGANISASI · ${org}` }
    case 'organization.updated':
      return { text: `Organisasi "${targetOf(entry)}" diperbarui`, scope: `ORGANISASI · ${org}` }
    case 'organization.settings_updated':
      return { text: `Pengaturan organisasi "${targetOf(entry)}" diperbarui`, scope: `ORGANISASI · ${org}` }
    case 'organization.storage_quota_updated':
      return { text: `Kuota atau retensi organisasi "${targetOf(entry)}" diperbarui`, scope: `STORAGE · ${org}` }
    case 'organization.deactivated':
      return { text: `Organisasi "${targetOf(entry)}" dinonaktifkan`, scope: `ORGANISASI · ${org}` }
    case 'organization.reactivated':
      return { text: `Organisasi "${targetOf(entry)}" diaktifkan kembali`, scope: `ORGANISASI · ${org}` }
    case 'organization.deleted':
      return { text: `Organisasi "${targetOf(entry)}" dihapus`, scope: `ORGANISASI · ${org}` }
    case 'workspace.created':
      return { text: `Workspace "${targetOf(entry)}" dibuat`, scope: `WORKSPACE · ${org}` }
    case 'workspace.updated':
      return { text: `Workspace "${targetOf(entry)}" diperbarui`, scope: `WORKSPACE · ${org}` }
    case 'workspace.moved':
      return { text: `Workspace "${targetOf(entry)}" dipindahkan ke organisasi lain`, scope: `WORKSPACE · ${org}` }
    case 'workspace.deleted':
      return { text: `Workspace "${targetOf(entry)}" dihapus`, scope: `WORKSPACE · ${org}` }
    case 'workspace.restored':
      return { text: `Workspace "${targetOf(entry)}" dipulihkan`, scope: `WORKSPACE · ${org}` }
    case 'webhook.created':
      return { text: `Webhook "${targetOf(entry)}" didaftarkan`, scope: `WEBHOOK · ${org}` }
    case 'webhook.updated':
      return { text: `Webhook "${targetOf(entry)}" diperbarui`, scope: `WEBHOOK · ${org}` }
    case 'webhook.activated':
      return { text: `Webhook "${targetOf(entry)}" diaktifkan`, scope: `WEBHOOK · ${org}` }
    case 'webhook.deactivated':
      return { text: `Webhook "${targetOf(entry)}" dinonaktifkan`, scope: `WEBHOOK · ${org}` }
    case 'webhook.secret_regenerated':
      return { text: `Secret webhook "${targetOf(entry)}" dibuat ulang`, scope: `WEBHOOK · ${org}` }
    case 'webhook.deleted':
      return { text: `Webhook "${targetOf(entry)}" dihapus`, scope: `WEBHOOK · ${org}` }
    case 'group.locale_updated':
      return { text: 'Format regional grup (tanggal/waktu/zona waktu/angka) diperbarui', scope: `BAHASA & LOKAL · ${org}` }
    // invitation.* -- dipakai BERSAMA undangan workspace biasa (org_id
    // diresolve dari workspace_id, bug lama diperbaiki 2026-09-11 --
    // sebelumnya org_id TIDAK PERNAH diisi jadi baris ini tidak pernah
    // terlihat GA Audit Trail sama sekali) dan undangan Eksekutif murni
    // (metadata.is_executive_invite) -- dibedakan dari metadata, BUKAN
    // field terpisah di audit_logs. email SELALU ada di metadata (entity_id
    // undangan tidak resolve ke nama apa pun lewat JOIN, beda dari
    // workspace/webhook yang punya tabel target bernama).
    case 'invitation.created':
      return {
        text: entry.metadata?.is_executive_invite === true
          ? `Undangan Eksekutif dibuat untuk "${emailOf(entry)}"`
          : `Undangan workspace dibuat untuk "${emailOf(entry)}"`,
        scope: `MEMBERS & ROLES · ${org}`,
      }
    case 'invitation.cancelled':
      return {
        text: entry.metadata?.is_executive_invite === true
          ? `Undangan Eksekutif "${emailOf(entry)}" dibatalkan`
          : `Undangan workspace "${emailOf(entry)}" dibatalkan`,
        scope: `MEMBERS & ROLES · ${org}`,
      }
    case 'invitation.accepted':
      return {
        text: entry.metadata?.is_executive_invite === true
          ? `Undangan Eksekutif "${emailOf(entry)}" diterima -- akun aktif`
          : `Undangan workspace "${emailOf(entry)}" diterima -- akun aktif`,
        scope: `MEMBERS & ROLES · ${org}`,
      }
    case 'invitation.identity_updated':
      return { text: `Nama/Jabatan Eksekutif "${emailOf(entry)}" diperbarui sebelum aktivasi`, scope: `MEMBERS & ROLES · ${org}` }
    default:
      return { text: `${entry.action} pada ${entry.entity_type}`, scope: `${entry.entity_type.toUpperCase()} · ${org}` }
  }
}
