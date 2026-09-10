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
    default:
      return { text: `${entry.action} pada ${entry.entity_type}`, scope: `${entry.entity_type.toUpperCase()} · ${org}` }
  }
}
