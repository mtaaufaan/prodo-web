import type { PlatformAuditLogEntry } from './types'

// formatAuditNarrative -- kalimat siap-baca per baris (feedback user
// 2026-08-28), meniru gaya desain "PA Audit Trail" (mis. "Mengubah batas
// kuota global tier BUSINESS: 60 GB → 80 GB"). Pelaku SENGAJA tidak
// disebut di kalimat -- sudah ada kolom "Pelaku" terpisah di tabel, sama
// seperti mockup asli.
//
// PENTING untuk pengembangan selanjutnya: setiap kali menambah action
// code BARU ke account_repository.go (logAudit/logTierAudit/INSERT
// langsung ke platform_audit_logs), tambahkan juga entrinya di sini.
// Action yang tidak dikenali jatuh ke fallback generik (masih tampil,
// tidak error) supaya lupa menambah entri di sini tidak pernah membuat
// halaman ini rusak -- tapi fallback-nya kurang informatif, jadi jangan
// mengandalkannya sebagai penyelesaian permanen.
// tierNameFromMetadata -- snapshot nama tier di metadata.tier_name (diisi
// writeAuditLog/logTierAudit di account_repository.go), dipakai sebagai
// fallback saat target_tier_name null. Bug ditemukan user (2026-08-29):
// target_tier_name di-resolve lewat LIVE JOIN ke service_tiers -- begitu
// tier itu dihapus, SEMUA entry lama (termasuk tier.created) ikut
// menampilkan "target tidak diketahui" walau baru saja dibuat. Snapshot
// immutable ini tidak rusak oleh penghapusan tier di kemudian hari.
function tierNameFromMetadata(entry: PlatformAuditLogEntry): string | null {
  const name = entry.metadata?.tier_name
  return typeof name === 'string' ? name : null
}

function targetOf(entry: PlatformAuditLogEntry): string {
  return entry.target_user_name ?? entry.target_tier_name ?? tierNameFromMetadata(entry) ?? 'target tidak diketahui'
}

// stateBool/stateNumber/metaString -- pembaca aman untuk state_before/
// state_after/metadata (2026-08-29, permintaan user: perubahan satu nilai
// skalar perlu menyertakan nilai sebelum-sesudah). Mengembalikan null
// kalau field tidak ada (entry lama sebelum kolom ini dipopulasikan) --
// pemanggil jatuh ke kalimat generik lama.
function stateBool(state: Record<string, unknown> | null, key: string): boolean | null {
  const v = state?.[key]
  return typeof v === 'boolean' ? v : null
}
function stateNumber(state: Record<string, unknown> | null, key: string): number | null {
  const v = state?.[key]
  return typeof v === 'number' ? v : null
}
function metaString(entry: PlatformAuditLogEntry, key: string): string | null {
  const v = entry.metadata?.[key]
  return typeof v === 'string' ? v : null
}

// targetRoleLabel -- S4P-40: user.invited/user.suspended/user.reactivated
// dipakai BERSAMA untuk Group Admin (S4P-02/S1-05) dan Platform Admin
// (S4P-37/38). target_user_role membedakan keduanya supaya kalimat tidak
// salah sebut role. Default "Group Admin" kalau role tidak diketahui
// (baris lama sebelum kolom ini ada, atau entity_type bukan 'user').
function targetRoleLabel(entry: PlatformAuditLogEntry): string {
  return entry.target_user_role === 'platform_admin' ? 'Platform Admin' : 'Group Admin'
}

export function formatAuditNarrative(entry: PlatformAuditLogEntry): string {
  const target = targetOf(entry)
  const roleLabel = targetRoleLabel(entry)
  switch (entry.action) {
    case 'user.invited':
      return `Mengundang ${roleLabel} baru — ${target}.`
    case 'user.updated':
      return `Memperbarui data Group Admin ${target}.`
    case 'user.suspended':
      return `Menon-aktifkan (suspend) akun ${roleLabel} ${target}.`
    case 'user.reactivated':
      return `Mengaktifkan kembali akun ${roleLabel} ${target}.`
    case 'user.mfa_reset':
      return `Mereset MFA akun ${roleLabel} ${target} — wajib setup ulang saat login berikutnya.`
    case 'user.deleted':
      return `Menghapus permanen akun Group Admin ${target}.`
    case 'user.activation_resent':
      return `Mengirim ulang link aktivasi ke Group Admin ${target}.`
    case 'user.login':
      return 'Berhasil login (password + verifikasi MFA).'
    case 'group.transferred':
      return `Memindahkan pengelolaan grup dari ${target} ke Group Admin lain.`
    case 'group.contract_created':
      return `Membuat kontrak awal untuk grup milik ${target}.`
    case 'group.contract_renewed':
      return `Memperpanjang kontrak grup milik ${target}.`
    case 'tier.created':
      return `Menambahkan tier baru ${target} ke katalog.`
    case 'tier.updated':
      return `Mengubah komponen tier ${target}.`
    case 'tier.deactivated':
    case 'tier.reactivated': {
      const before = stateBool(entry.state_before, 'deactivated')
      const after = stateBool(entry.state_after, 'deactivated')
      if (before !== null && after !== null) {
        const label = (v: boolean) => (v ? 'nonaktif' : 'aktif')
        return `Mengubah status tier ${target} dari ${label(before)} menjadi ${label(after)}.`
      }
      return entry.action === 'tier.deactivated' ? `Menonaktifkan tier ${target}.` : `Mengaktifkan kembali tier ${target}.`
    }
    case 'tier.archived':
    case 'tier.unarchived': {
      const before = stateBool(entry.state_before, 'archived')
      const after = stateBool(entry.state_after, 'archived')
      if (before !== null && after !== null) {
        const label = (v: boolean) => (v ? 'diarsipkan' : 'tidak diarsipkan')
        return `Mengubah status arsip tier ${target} dari ${label(before)} menjadi ${label(after)}.`
      }
      return entry.action === 'tier.archived' ? `Meng-archive tier ${target}.` : `Memulihkan tier ${target} dari arsip.`
    }
    case 'tier.deleted':
      return `Menghapus permanen tier ${target} dari katalog.`
    case 'platform_settings.session_timeout_changed': {
      const before = stateNumber(entry.state_before, 'idle_timeout_seconds')
      const after = stateNumber(entry.state_after, 'idle_timeout_seconds')
      if (after !== null) {
        const beforeLabel = before !== null ? `${before / 60} menit` : 'default global'
        return `Mengubah batas waktu idle sesi dari ${beforeLabel} menjadi ${after / 60} menit.`
      }
      return 'Mengubah batas waktu idle sesi untuk akun sendiri.'
    }
    case 'platform_settings.ip_allowlist_enabled_changed': {
      const before = stateBool(entry.state_before, 'enabled')
      const after = stateBool(entry.state_after, 'enabled')
      if (before !== null && after !== null) {
        const label = (v: boolean) => (v ? 'aktif' : 'nonaktif')
        return `Mengubah status enforcement IP Allowlist dari ${label(before)} menjadi ${label(after)} (berlaku untuk semua akun Platform Admin).`
      }
      return 'Mengubah status aktif/nonaktif enforcement IP Allowlist (berlaku untuk semua akun Platform Admin).'
    }
    case 'ip_allowlist.added': {
      const cidr = metaString(entry, 'cidr')
      return cidr
        ? `Menambahkan CIDR ${cidr} ke daftar IP yang diizinkan (berlaku untuk semua akun Platform Admin).`
        : 'Menambahkan entri baru ke daftar IP yang diizinkan (berlaku untuk semua akun Platform Admin).'
    }
    case 'ip_allowlist.removed': {
      const cidr = metaString(entry, 'cidr')
      return cidr
        ? `Menghapus CIDR ${cidr} dari daftar IP yang diizinkan (berlaku untuk semua akun Platform Admin).`
        : 'Menghapus satu entri dari daftar IP yang diizinkan (berlaku untuk semua akun Platform Admin).'
    }
    case 'erasure.executed':
      return `Mengeksekusi Right to Erasure untuk ${target} (pseudonymization, revoke sesi, hapus MFA).`
    case 'erasure.rejected':
      return `Menolak permintaan Right to Erasure untuk ${target}.`
    default:
      return `Melakukan aksi "${entry.action}" pada ${entry.entity_type}.`
  }
}
