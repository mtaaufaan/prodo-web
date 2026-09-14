import { describe, expect, it, beforeEach, vi } from 'vitest'

import { queryClient } from '@/lib/query-client'
import { useAuthStore } from './useAuthStore'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession()
  })

  it('starts with no session', () => {
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setSession stores token and user', () => {
    useAuthStore.getState().setSession({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'user-1', email: 'a@b.com', display_name: 'A', platform_role: 'member', avatar_url: null },
    })
    expect(useAuthStore.getState().accessToken).toBe('at')
    expect(useAuthStore.getState().user?.id).toBe('user-1')
  })

  it('clearSession resets everything', () => {
    useAuthStore.getState().setSession({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'user-1', email: 'a@b.com', display_name: 'A', platform_role: 'member', avatar_url: null },
    })
    useAuthStore.getState().clearSession()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('wasPlatformAdmin survives clearSession so AuthGuard can redirect PA sessions correctly', () => {
    useAuthStore.getState().setSession({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'pa-1', email: 'pa@b.com', display_name: 'PA', platform_role: 'platform_admin', avatar_url: null },
    })
    expect(useAuthStore.getState().wasPlatformAdmin).toBe(true)
    useAuthStore.getState().clearSession()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().wasPlatformAdmin).toBe(true)
  })

  it('wasPlatformAdmin is false for non-PA roles', () => {
    useAuthStore.getState().setSession({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'user-1', email: 'a@b.com', display_name: 'A', platform_role: 'member', avatar_url: null },
    })
    expect(useAuthStore.getState().wasPlatformAdmin).toBe(false)
  })

  // Ditemukan user 2026-09-14: query global tanpa scope user (mis.
  // ['me-context'], staleTime 1 menit) menyimpan respons akun SEBELUMNYA --
  // login sebagai akun lain di browser yang sama dalam waktu <1 menit
  // menampilkan data akun lama (contoh nyata: tombol konsol Group Admin
  // muncul untuk member biasa). Fix: setSession/clearSession WAJIB
  // membersihkan seluruh cache React Query, bukan cuma token/user.
  it('setSession clears the React Query cache so a new account never sees the previous account\'s cached data', () => {
    const clearSpy = vi.spyOn(queryClient, 'clear')
    useAuthStore.getState().setSession({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'user-1', email: 'a@b.com', display_name: 'A', platform_role: 'member', avatar_url: null },
    })
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })

  it('clearSession clears the React Query cache', () => {
    const clearSpy = vi.spyOn(queryClient, 'clear')
    useAuthStore.getState().clearSession()
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })
})
