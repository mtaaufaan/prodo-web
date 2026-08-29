import { z } from 'zod'

export interface IPAllowlistEntry {
  id: string
  cidr: string
  created_at: string
}

export interface SecuritySettings {
  session_idle_timeout_seconds: number
  ip_allowlist_enabled: boolean
  ip_allowlist: IPAllowlistEntry[]
}

export const addIPAllowlistSchema = z.object({
  cidr: z.string().min(1, 'CIDR wajib diisi'),
})
export type AddIPAllowlistFormValues = z.infer<typeof addIPAllowlistSchema>
