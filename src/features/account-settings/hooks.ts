import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  changePassword,
  getProfile,
  listNotificationPreferences,
  type NotificationScope,
  regenerateBackupCodes,
  setupSelfMFA,
  updateNotificationPreference,
  updateProfile,
  verifySelfMFA,
} from './api'
import type { Profile } from './types'

export const profileKeys = { all: ['account-profile'] as const }
export const notificationPreferenceKeys = {
  all: ['account-notification-preferences'] as const,
  scope: (scope: NotificationScope) => ['account-notification-preferences', scope] as const,
}

export function useProfile() {
  return useQuery({ queryKey: profileKeys.all, queryFn: getProfile })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data: Profile) => queryClient.setQueryData(profileKeys.all, data),
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword })
}

export function useSetupSelfMFA() {
  return useMutation({ mutationFn: setupSelfMFA })
}

export function useVerifySelfMFA() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: verifySelfMFA,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.all }),
  })
}

export function useRegenerateBackupCodes() {
  return useMutation({ mutationFn: regenerateBackupCodes })
}

export function useNotificationPreferences(scope: NotificationScope) {
  return useQuery({ queryKey: notificationPreferenceKeys.scope(scope), queryFn: () => listNotificationPreferences(scope) })
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateNotificationPreference,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationPreferenceKeys.all }),
  })
}
