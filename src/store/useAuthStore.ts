import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { queryClient } from '@/lib/query-client'

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
  // Sengaja TIDAK ikut di-null-kan oleh clearSession -- dipakai AuthGuard
  // untuk tahu harus redirect ke /platform/login atau /login setelah sesi
  // berakhir sendiri (idle/expired), padahal `user` sudah null saat itu.
  wasPlatformAdmin: boolean
  setSession: (session: { accessToken: string; refreshToken: string; user: AuthUser }) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      wasPlatformAdmin: false,
      setSession: ({ accessToken, refreshToken, user }) => {
        // Bersihkan cache React Query SETIAP kali sesi berganti (root cause,
        // bukan per-caller) -- ditemukan user 2026-09-14: query key global
        // tanpa scope user (mis. ['me-context'], staleTime 1 menit) menyimpan
        // respons akun SEBELUMNYA, jadi login sebagai akun lain di browser
        // yang sama dalam waktu <1 menit menampilkan data akun lama (contoh
        // nyata: tombol "Buka Konsol Group Admin" muncul untuk member biasa)
        // sampai cache itu sendiri kedaluwarsa.
        queryClient.clear()
        set({ accessToken, refreshToken, user, wasPlatformAdmin: user.platform_role === 'platform_admin' })
      },
      clearSession: () => {
        queryClient.clear()
        set({ accessToken: null, refreshToken: null, user: null })
      },
    }),
    { name: 'prodo-auth' },
  ),
)
