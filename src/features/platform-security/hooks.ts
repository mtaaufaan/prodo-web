import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { addIPAllowlistEntry, deleteIPAllowlistEntry, getSecuritySettings, updateSessionTimeoutSeconds } from './api'

export const securitySettingsKeys = {
  all: ['platform-security-settings'] as const,
}

const securitySettingsQuery = () =>
  queryOptions({
    queryKey: securitySettingsKeys.all,
    queryFn: () => getSecuritySettings(),
  })

export function useSecuritySettings() {
  return useQuery(securitySettingsQuery())
}

export function useUpdateSessionTimeout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (seconds: number) => updateSessionTimeoutSeconds(seconds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: securitySettingsKeys.all }),
  })
}

export function useAddIPAllowlistEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cidr: string) => addIPAllowlistEntry(cidr),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: securitySettingsKeys.all }),
  })
}

export function useDeleteIPAllowlistEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteIPAllowlistEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: securitySettingsKeys.all }),
  })
}
