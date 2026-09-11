import { apiClient } from '@/lib/api'

import type { NotificationPreference, Profile } from './types'

export function getProfile() {
  return apiClient.get<Profile>('/api/v1/users/me')
}

export function updateProfile(body: { display_name: string; title: string; phone: string; locale: string }) {
  return apiClient.patch<Profile>('/api/v1/users/me', body)
}

export function changePassword(body: { current_password: string; new_password: string }) {
  return apiClient.post<{ message: string; revoked_other_sessions: number }>('/api/v1/auth/password/change', body)
}

export function setupSelfMFA() {
  return apiClient.post<{ totp_qr_url: string; totp_secret: string }>('/api/v1/auth/mfa/setup')
}

export function verifySelfMFA(otpCode: string) {
  return apiClient.post<{ mfa_enabled: boolean; backup_codes: string[] }>('/api/v1/auth/mfa/verify', { otp_code: otpCode })
}

export function regenerateBackupCodes() {
  return apiClient.post<{ backup_codes: string[] }>('/api/v1/auth/mfa/backup-codes/regenerate')
}

export function listNotificationPreferences() {
  return apiClient.get<NotificationPreference[]>('/api/v1/users/me/notification-preferences')
}

export function updateNotificationPreference(body: { event_type: string; push: boolean; email: boolean }) {
  return apiClient.patch<NotificationPreference>('/api/v1/users/me/notification-preferences', body)
}
