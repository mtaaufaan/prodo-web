import { useMutation } from '@tanstack/react-query'

import { useAuthStore } from '@/store/useAuthStore'

import { login } from './api'

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession)

  return useMutation({
    mutationFn: ({ email, password, mfaCode }: { email: string; password: string; mfaCode: string }) =>
      login(email, password, mfaCode),
    onSuccess: (result) => {
      setSession({ accessToken: result.access_token, refreshToken: result.refresh_token, user: result.user })
    },
  })
}
