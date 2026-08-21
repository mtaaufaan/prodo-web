import { apiClient } from '@/lib/api'

import type { LoginResponse } from './types'

export function login(email: string, password: string, mfaCode: string) {
  return apiClient.post<LoginResponse>('/api/v1/auth/login', {
    email,
    password,
    mfa_code: mfaCode,
  })
}
