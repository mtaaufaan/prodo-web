import { useMutation, useQuery } from '@tanstack/react-query'

import { acceptInvitation, previewInvitation } from './api'

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: ({ token, displayName, title, password }: { token: string; displayName: string; title: string; password: string }) =>
      acceptInvitation(token, displayName, title, password),
  })
}

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: () => previewInvitation(token),
    enabled: token !== '',
    retry: false,
  })
}
