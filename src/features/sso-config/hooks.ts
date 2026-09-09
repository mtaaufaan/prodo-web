import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getSsoConfig, updateSsoConfig } from './api'
import type { SsoConfigFormValues } from './types'

export const ssoConfigKeys = {
  all: ['sso-config'] as const,
  detail: (orgId: string) => [...ssoConfigKeys.all, 'detail', orgId] as const,
}

export function useSsoConfig(orgId: string) {
  return useQuery({
    queryKey: ssoConfigKeys.detail(orgId),
    queryFn: () => getSsoConfig(orgId),
    enabled: orgId !== '',
  })
}

export function useUpdateSsoConfig(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: SsoConfigFormValues) => updateSsoConfig(orgId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ssoConfigKeys.detail(orgId) }),
  })
}
