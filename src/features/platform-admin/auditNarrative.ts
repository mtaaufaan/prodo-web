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
function targetOf(entry: PlatformAuditLogEntry): string {
  return entry.target_user_name ?? entry.target_tier_name ?? 'target tidak diketahui'
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
      return `Menonaktifkan tier ${target}.`
    case 'tier.reactivated':
      return `Mengaktifkan kembali tier ${target}.`
    case 'tier.archived':
      return `Meng-archive tier ${target}.`
    case 'tier.unarchived':
      return `Memulihkan tier ${target} dari arsip.`
    case 'tier.deleted':
      return `Menghapus permanen tier ${target} dari katalog.`
    case 'platform_settings.session_timeout_changed':
      return 'Mengubah batas waktu idle sesi global untuk seluruh akun Platform Admin.'
    case 'ip_allowlist.added':
      return 'Menambahkan entri baru ke daftar IP yang diizinkan.'
    case 'ip_allowlist.removed':
      return 'Menghapus satu entri dari daftar IP yang diizinkan.'
    case 'erasure.executed':
      return `Mengeksekusi Right to Erasure untuk ${target} (pseudonymization, revoke sesi, hapus MFA).`
    case 'erasure.rejected':
      return `Menolak permintaan Right to Erasure untuk ${target}.`
    default:
      return `Melakukan aksi "${entry.action}" pada ${entry.entity_type}.`
  }
}
