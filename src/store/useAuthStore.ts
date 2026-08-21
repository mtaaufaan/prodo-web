import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// S1-25, US-001: sesi login disimpan lewat Zustand (persist -> localStorage,
// bukan raw localStorage.getItem/setItem manual seperti placeholder S0-28)
// supaya satu sumber kebenaran dipakai bareng oleh axios interceptor
// (src/lib/api.ts) dan AuthGuard.
export interface AuthUser {
  id: string
  email: string
  display_name: string
  platform_role: string
  avatar_url: string | null
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  setSession: (session: { accessToken: string; refreshToken: string; user: AuthUser }) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user }),
      clearSession: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'prodo-auth' },
  ),
)
