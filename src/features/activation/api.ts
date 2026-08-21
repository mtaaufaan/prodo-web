import { apiClient } from '@/lib/api'

import type { ActivateResponse, MfaVerifyResponse } from './types'

export function activateAccount(token: string, password: string) {
  return apiClient.post<ActivateResponse>('/api/v1/auth/activate', { token, password })
}

export function verifyMfa(token: string, otpCode: string) {
  return apiClient.post<MfaVerifyResponse>('/api/v1/auth/activate/mfa-verify', {
    token,
    otp_code: otpCode,
  })
}
