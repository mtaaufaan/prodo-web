import { useMutation } from '@tanstack/react-query'

import { acceptInvitation } from './api'

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: ({ token, displayName, password }: { token: string; displayName: string; password: string }) =>
      acceptInvitation(token, displayName, password),
  })
}
