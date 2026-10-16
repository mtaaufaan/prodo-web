import { http, HttpResponse } from 'msw'

import { mockContext, mockFollowedProjects, mockProjects, mockSprints, mockStatuses, mockTasks, mockWorkspace } from './editorFixtures'

const ok = (data: unknown) => HttpResponse.json({ data })

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

  // Kerangka Master UI Editor (S6E-01): sesi mock = akun Editor (lihat main.tsx).
  http.get('/api/v1/me/context', () => ok(mockContext)),
  http.get('/api/v1/me/projects', () => ok(mockFollowedProjects)),
  http.get('/api/v1/workspaces/:id', () => ok(mockWorkspace)),
  http.get('/api/v1/workspaces/:id/projects', () => ok(mockProjects)),
  http.get('/api/v1/projects/:id/statuses', () => ok(mockStatuses)),
  http.get('/api/v1/projects/:id/sprints', () => ok(mockSprints)),
  http.get('/api/v1/projects/:id/tasks', () => ok(mockTasks)),
  http.get('/api/v1/projects/:id/members', () => ok([])),
]
