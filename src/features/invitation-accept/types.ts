import { z } from 'zod'

import { passwordSchema } from '@/features/activation/types'

// S2-27, US-006. passwordSchema di-reuse dari features/activation --
// syarat sama persis (backend juga reuse validator.ValidatePasswordComplexity
// yang sama untuk kedua alur, lihat internal/handler/invitation_handler.go).
// title (Jabatan) OPSIONAL untuk semua jenis undangan (permintaan user
// 2026-09-10) -- untuk Eksekutif, nilainya bisa datang pre-filled dari
// InvitationPreview (GA sudah isi lewat "Kelola") tapi tetap bisa diedit.
export const acceptInvitationFormSchema = z
  .object({
    displayName: z.string().min(2, 'Nama minimal 2 karakter'),
    title: z.string(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  })

export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationFormSchema>

export interface AcceptInvitationResponse {
  user_id: string
  email: string
  workspace_id: string
  role: string
}

// InvitationPreview -- GET /invitations/preview?token= (`[PUBLIC]`),
// dibaca AcceptInvitationPage SEBELUM submit untuk tahu apakah ini
// undangan Eksekutif (copy beda) dan pre-fill Nama/Jabatan kalau GA
// sudah mengisikannya lewat "Kelola".
export interface InvitationPreview {
  is_executive: boolean
  display_name: string
  title: string
}
