import { z } from 'zod'

// Sinkron dengan internal/pkg/validator/password.go ValidatePasswordComplexity
// (backend tetap sumber kebenaran validasi, ini cuma untuk error inline cepat).
export const passwordSchema = z
  .string()
  .min(12, 'Password minimal 12 karakter')
  .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
  .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
  .regex(/[0-9]/, 'Password harus mengandung angka')
  .regex(/[^A-Za-z0-9]/, 'Password harus mengandung karakter spesial')

export const activateFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  })

export type ActivateFormValues = z.infer<typeof activateFormSchema>

export const mfaVerifyFormSchema = z.object({
  otpCode: z
    .string()
    .length(6, 'Kode OTP harus 6 digit')
    .regex(/^\d+$/, 'Kode OTP harus berupa angka'),
})

export type MfaVerifyFormValues = z.infer<typeof mfaVerifyFormSchema>

export interface ActivateResponse {
  message: string
  totp_qr_url: string
}

export interface MfaVerifyResponse {
  message: string
  mfa_enabled: boolean
}
