import { apiClient } from '@/lib/api'

import type { AcceptInvitationResponse } from './types'

export function acceptInvitation(token: string, displayName: string, password: string) {
  return apiClient.post<AcceptInvitationResponse>('/api/v1/auth/invitations/accept', {
    token,
    display_name: displayName,
    password,
  })
}
