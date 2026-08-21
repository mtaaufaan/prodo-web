import { useMutation } from '@tanstack/react-query'

import { activateAccount, verifyMfa } from './api'

export function useActivateAccount() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      activateAccount(token, password),
  })
}

export function useVerifyMfa() {
  return useMutation({
    mutationFn: ({ token, otpCode }: { token: string; otpCode: string }) => verifyMfa(token, otpCode),
  })
}
