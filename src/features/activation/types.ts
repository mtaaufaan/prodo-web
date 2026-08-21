import { z } from 'zod'

// Sinkron dengan internal/pkg/validator/password.go ValidatePasswordComplexity
// (backend tetap sumber kebenaran validasi, ini cuma untuk error inline cepat
// dan checklist real-time di bawah).
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
  totp_secret: string
  email: string
  display_name: string
}

export interface MfaVerifyResponse {
  message: string
  mfa_enabled: boolean
  backup_codes: string[]
}

export interface PasswordCheck {
  label: string
  ok: boolean
}

// Checklist syarat password real-time (Set Password.dc.html) -- 5 syarat
// yang persis sama dengan ValidatePasswordComplexity di backend, dievaluasi
// per-syarat (bukan satu pesan gabungan) supaya user tahu persis mana yang
// belum terpenuhi saat mengetik.
export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: 'Minimal 12 karakter', ok: password.length >= 12 },
    { label: 'Mengandung huruf besar', ok: /[A-Z]/.test(password) },
    { label: 'Mengandung huruf kecil', ok: /[a-z]/.test(password) },
    { label: 'Mengandung angka', ok: /[0-9]/.test(password) },
    { label: 'Mengandung karakter spesial', ok: /[^A-Za-z0-9]/.test(password) },
  ]
}
