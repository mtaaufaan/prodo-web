import type { NotificationPreference, Profile } from '@/features/account-settings/types'
import type { SessionSummary } from '@/features/sessions/types'

import { MOCK_USER } from './editorFixtures'

// Data tiruan Pengaturan Akun Editor (S6E-13, IG-144) -- BERSTATE di memori supaya 5 tab bisa dicoba tanpa
// backend: profil, preferensi notifikasi, sesi, password, MFA. Hanya dipakai `npm run dev:mock`.
const HOUR = 3_600_000

let profile: Profile = {
  id: MOCK_USER.id,
  email: MOCK_USER.email,
  display_name: MOCK_USER.display_name,
  title: 'Product Delivery',
  phone: '+62 812 4400 118',
  avatar_url: null,
  platform_role: 'none',
  locale: 'id',
  mfa_enabled: false,
  last_login_at: new Date(Date.now() - 2 * HOUR).toISOString(),
  created_at: '2026-09-01T00:00:00Z',
}

export const getProfile = (): Profile => profile

export function updateProfile(body: { display_name: string; title: string; phone: string; locale: string }): Profile {
  profile = { ...profile, display_name: body.display_name, title: body.title || null, phone: body.phone || null, locale: body.locale === 'en' ? 'en' : 'id' }
  return profile
}

export const setMfaEnabled = (on: boolean) => (profile = { ...profile, mfa_enabled: on })

// Enam jenis notifikasi workspace (WorkspaceNotificationEvents di backend) -- in-app selalu aktif.
const prefs: NotificationPreference[] = [
  { event_type: 'comment.mention', in_app: true, push: true, email: true },
  { event_type: 'task.pic_assigned', in_app: true, push: true, email: true },
  { event_type: 'task.assigned', in_app: true, push: false, email: true },
  { event_type: 'task.due_date', in_app: true, push: false, email: true },
  { event_type: 'approval.pending', in_app: true, push: true, email: true },
  { event_type: 'account.security_activity', in_app: true, push: true, email: true },
]

export const listPrefs = (): NotificationPreference[] => prefs

export function updatePref(eventType: string, push: boolean, email: boolean): NotificationPreference | null {
  const hit = prefs.find((p) => p.event_type === eventType)
  if (!hit) return null
  hit.push = push
  hit.email = email
  return hit
}

let sessions: SessionSummary[] = [
  { jti: 'mock-s1', device_info: { browser: 'Chrome 140', os: 'Windows 11', ip: '103.28.14.77' }, created_at: new Date(Date.now() - 3 * HOUR).toISOString(), last_active_at: new Date().toISOString(), is_current: true },
  { jti: 'mock-s2', device_info: { browser: 'Safari', os: 'iPhone 15', ip: '103.28.14.90' }, created_at: new Date(Date.now() - 30 * HOUR).toISOString(), last_active_at: new Date(Date.now() - 2 * HOUR).toISOString(), is_current: false },
  { jti: 'mock-s3', device_info: { browser: 'Edge 139', os: 'Windows 11', ip: '118.99.72.14', }, created_at: new Date(Date.now() - 96 * HOUR).toISOString(), last_active_at: new Date(Date.now() - 80 * HOUR).toISOString(), is_current: false },
]

export const listSessions = (): SessionSummary[] => sessions
export const revokeSession = (jti: string) => (sessions = sessions.filter((s) => s.jti !== jti || s.is_current))
export function revokeOthers(): number {
  const others = sessions.filter((s) => !s.is_current).length
  sessions = sessions.filter((s) => s.is_current)
  return others
}

const codes = () => Array.from({ length: 10 }, (_, i) => `PRD${String(i + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`)
export const newBackupCodes = codes
