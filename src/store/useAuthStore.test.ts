import { describe, expect, it, beforeEach } from 'vitest'

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
})
