import { z } from 'zod'

import type { AuthUser } from '@/store/useAuthStore'

// S4P-14/19 (implementation_gaps.md IG-20): login Platform Admin lewat
// endpoint yang SAMA (`POST /auth/login`) dengan member/GA -- bedanya
// respons saat MFA belum aktif: bukan error, tapi payload setup MFA
// (`mfa_setup_required: true`). Union type di bawah mencerminkan itu.

export const platformLoginFormSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export type PlatformLoginFormValues = z.infer<typeof platformLoginFormSchema>

export interface PlatformLoginSuccess {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}

export interface PlatformMfaSetupRequired {
  mfa_setup_required: true
  totp_qr_url: string
  totp_secret: string
  email: string
}

export type PlatformLoginResponse = PlatformLoginSuccess | PlatformMfaSetupRequired

export function isMfaSetupRequired(res: PlatformLoginResponse): res is PlatformMfaSetupRequired {
  return 'mfa_setup_required' in res
}

export interface PlatformMfaSetupCompleteResponse extends PlatformLoginSuccess {
  backup_codes: string[]
}
