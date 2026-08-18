import { http, HttpResponse } from 'msw'

// Handler skeleton untuk dev paralel FE/BE (S0-26). Mengikuti bentuk
// response nyata di docs/API_CONTRACT.md (envelope { data, meta } / { error }).
// Ditambah per fitur begitu development-nya butuh backend yang belum siap --
// bukan daftar lengkap seluruh endpoint.
export const handlers = [
  http.post('/api/v1/auth/login', () => {
    return HttpResponse.json({
      data: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        user: {
          id: 'mock-user-id',
          email: 'demo@prodo.local',
          name: 'Demo User',
          role: 'member',
        },
      },
    })
  }),

  http.get('/api/v1/users/me', () => {
    return HttpResponse.json({
      data: {
        id: 'mock-user-id',
        email: 'demo@prodo.local',
        name: 'Demo User',
        role: 'member',
      },
    })
  }),
]
