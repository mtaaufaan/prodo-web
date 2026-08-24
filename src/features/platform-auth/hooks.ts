import { useMutation } from '@tanstack/react-query'

import { useAuthStore } from '@/store/useAuthStore'

import { completePlatformMfaSetup, platformLogin } from './api'
import { isMfaSetupRequired } from './types'

export function usePlatformLogin() {
  const setSession = useAuthStore((state) => state.setSession)

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => platformLogin(email, password),
    onSuccess: (result) => {
      if (!isMfaSetupRequired(result)) {
        setSession({ accessToken: result.access_token, refreshToken: result.refresh_token, user: result.user })
      }
    },
  })
}

export function useCompletePlatformMfaSetup() {
  const setSession = useAuthStore((state) => state.setSession)

  return useMutation({
    mutationFn: ({ email, password, otpCode }: { email: string; password: string; otpCode: string }) =>
      completePlatformMfaSetup(email, password, otpCode),
    onSuccess: (result) => {
      setSession({ accessToken: result.access_token, refreshToken: result.refresh_token, user: result.user })
    },
  })
}
