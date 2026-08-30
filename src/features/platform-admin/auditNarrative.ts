import type { TFunction } from 'i18next'

import type { PlatformAuditLogEntry } from './types'

// formatAuditNarrative -- kalimat siap-baca per baris (feedback user
// 2026-08-28), meniru gaya desain "PA Audit Trail" (mis. "Mengubah batas
// kuota global tier BUSINESS: 60 GB → 80 GB"). Pelaku SENGAJA tidak
// disebut di kalimat -- sudah ada kolom "Pelaku" terpisah di tabel, sama
// seperti mockup asli.
//
// PENTING untuk pengembangan selanjutnya: setiap kali menambah action
// code BARU ke account_repository.go (logAudit/logTierAudit/INSERT
// langsung ke platform_audit_logs), tambahkan juga entrinya di sini DAN
// key terjemahan barunya di en.json/id.json (namespace auditNarrative).
// Action yang tidak dikenali jatuh ke fallback generik (masih tampil,
// tidak error) supaya lupa menambah entri di sini tidak pernah membuat
// halaman ini rusak -- tapi fallback-nya kurang informatif, jadi jangan
// mengandalkannya sebagai penyelesaian permanen.
//
// t diteruskan sebagai parameter (bukan useTranslation() di dalam sini)
// karena fungsi ini murni (dites langsung di auditNarrative.test.ts tanpa
// render komponen) -- pemanggil (AuditLogRow di PlatformAuditLogPage.tsx)
// yang menyediakan t dari useTranslation().
//
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

function targetOf(entry: PlatformAuditLogEntry, t: TFunction): string {
  return entry.target_user_name ?? entry.target_tier_name ?? tierNameFromMetadata(entry) ?? t('auditNarrative.unknownTarget')
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
function targetRoleLabel(entry: PlatformAuditLogEntry, t: TFunction): string {
  return entry.target_user_role === 'platform_admin' ? t('auditNarrative.roles.platformAdmin') : t('auditNarrative.roles.groupAdmin')
}

export function formatAuditNarrative(entry: PlatformAuditLogEntry, t: TFunction): string {
  const target = targetOf(entry, t)
  const role = targetRoleLabel(entry, t)
  switch (entry.action) {
    case 'user.invited':
      return t('auditNarrative.userInvited', { role, target })
    case 'user.updated':
      return t('auditNarrative.userUpdated', { target })
    case 'user.suspended':
      return t('auditNarrative.userSuspended', { role, target })
    case 'user.reactivated':
      return t('auditNarrative.userReactivated', { role, target })
    case 'user.mfa_reset':
      return t('auditNarrative.userMfaReset', { role, target })
    case 'user.deleted':
      return t('auditNarrative.userDeleted', { target })
    case 'user.activation_resent':
      return t('auditNarrative.userActivationResent', { target })
    case 'user.login':
      return t('auditNarrative.userLogin')
    case 'user.backup_code_used':
      return t('auditNarrative.userBackupCodeUsed')
    case 'group.transferred':
      return t('auditNarrative.groupTransferred', { target })
    case 'group.contract_created':
      return t('auditNarrative.groupContractCreated', { target })
    case 'group.contract_renewed':
      return t('auditNarrative.groupContractRenewed', { target })
    case 'tier.created':
      return t('auditNarrative.tierCreated', { target })
    case 'tier.updated':
      return t('auditNarrative.tierUpdated', { target })
    case 'tier.deactivated':
    case 'tier.reactivated': {
      const before = stateBool(entry.state_before, 'deactivated')
      const after = stateBool(entry.state_after, 'deactivated')
      if (before !== null && after !== null) {
        const label = (v: boolean) => (v ? t('auditNarrative.labels.inactive') : t('auditNarrative.labels.active'))
        return t('auditNarrative.tierStatusChanged', { target, before: label(before), after: label(after) })
      }
      return entry.action === 'tier.deactivated'
        ? t('auditNarrative.tierDeactivated', { target })
        : t('auditNarrative.tierReactivated', { target })
    }
    case 'tier.archived':
    case 'tier.unarchived': {
      const before = stateBool(entry.state_before, 'archived')
      const after = stateBool(entry.state_after, 'archived')
      if (before !== null && after !== null) {
        const label = (v: boolean) => (v ? t('auditNarrative.labels.archived') : t('auditNarrative.labels.notArchived'))
        return t('auditNarrative.tierArchiveStatusChanged', { target, before: label(before), after: label(after) })
      }
      return entry.action === 'tier.archived'
        ? t('auditNarrative.tierArchived', { target })
        : t('auditNarrative.tierUnarchived', { target })
    }
    case 'tier.deleted':
      return t('auditNarrative.tierDeleted', { target })
    case 'platform_settings.session_timeout_changed': {
      const before = stateNumber(entry.state_before, 'idle_timeout_seconds')
      const after = stateNumber(entry.state_after, 'idle_timeout_seconds')
      if (after !== null) {
        const beforeLabel =
          before !== null
            ? t('auditNarrative.sessionTimeoutMinutes', { count: before / 60 })
            : t('auditNarrative.sessionTimeoutDefaultGlobal')
        return t('auditNarrative.sessionTimeoutChanged', {
          before: beforeLabel,
          after: t('auditNarrative.sessionTimeoutMinutes', { count: after / 60 }),
        })
      }
      return t('auditNarrative.sessionTimeoutChangedGeneric')
    }
    case 'platform_settings.ip_allowlist_enabled_changed': {
      const before = stateBool(entry.state_before, 'enabled')
      const after = stateBool(entry.state_after, 'enabled')
      if (before !== null && after !== null) {
        const label = (v: boolean) => (v ? t('auditNarrative.labels.active') : t('auditNarrative.labels.inactive'))
        return t('auditNarrative.ipAllowlistEnabledChanged', { before: label(before), after: label(after) })
      }
      return t('auditNarrative.ipAllowlistEnabledChangedGeneric')
    }
    case 'ip_allowlist.added': {
      const cidr = metaString(entry, 'cidr')
      return cidr ? t('auditNarrative.ipAllowlistAdded', { cidr }) : t('auditNarrative.ipAllowlistAddedGeneric')
    }
    case 'ip_allowlist.removed': {
      const cidr = metaString(entry, 'cidr')
      return cidr ? t('auditNarrative.ipAllowlistRemoved', { cidr }) : t('auditNarrative.ipAllowlistRemovedGeneric')
    }
    case 'erasure.executed':
      return t('auditNarrative.erasureExecuted', { target })
    case 'erasure.rejected':
      return t('auditNarrative.erasureRejected', { target })
    default:
      return t('auditNarrative.genericFallback', { action: entry.action, entityType: entry.entity_type })
  }
}
