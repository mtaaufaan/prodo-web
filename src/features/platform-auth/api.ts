import { apiClient } from '@/lib/api'

import type { PlatformLoginResponse, PlatformMfaSetupCompleteResponse } from './types'

export function platformLogin(email: string, password: string) {
  return apiClient.post<PlatformLoginResponse>('/api/v1/auth/login', { email, password, mfa_code: '' })
}

export function completePlatformMfaSetup(email: string, password: string, otpCode: string) {
  return apiClient.post<PlatformMfaSetupCompleteResponse>('/api/v1/auth/platform/mfa-setup/verify', {
    email,
    password,
    otp_code: otpCode,
  })
}
