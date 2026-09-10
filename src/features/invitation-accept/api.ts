import { apiClient } from '@/lib/api'

import type { AcceptInvitationResponse, InvitationPreview } from './types'

export function acceptInvitation(token: string, displayName: string, title: string, password: string) {
  return apiClient.post<AcceptInvitationResponse>('/api/v1/auth/invitations/accept', {
    token,
    display_name: displayName,
    title,
    password,
  })
}

export function previewInvitation(token: string) {
  return apiClient.get<InvitationPreview>('/api/v1/invitations/preview', { params: { token } })
}
