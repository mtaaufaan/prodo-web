import { z } from 'zod'

import type { AuthUser } from '@/store/useAuthStore'

export const loginFormSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}
