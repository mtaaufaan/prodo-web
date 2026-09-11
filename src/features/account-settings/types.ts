export interface Profile {
  id: string
  email: string
  display_name: string
  title: string | null
  phone: string | null
  avatar_url: string | null
  platform_role: string
  locale: 'id' | 'en'
  mfa_enabled: boolean
  last_login_at: string | null
  created_at: string
}

export interface NotificationPreference {
  event_type: string
  in_app: boolean
  push: boolean
  email: boolean
}
