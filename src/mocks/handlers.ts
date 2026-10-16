import { http, HttpResponse } from 'msw'

import { mockContext, mockFollowedProjects, mockMembers, mockProjects, mockSprints, mockStatuses, mockTasks, mockWorkspace } from './editorFixtures'

import { addComment, listMine, moveStatus, setCompleteness } from './myTasksStore'

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
  http.get('/api/v1/projects/:id/members', () => ok(mockMembers)),

  // Task Saya + komentar (S6E-03) -- berstate di memori (myTasksStore.ts).
  http.get('/api/v1/me/tasks', ({ request }) => {
    const q = new URL(request.url).searchParams
    return ok(listMine(q.get('project_id') ?? '', q.get('view') === 'following' ? 'following' : 'assigned', Number(q.get('page') ?? 1), Number(q.get('per_page') ?? 10)))
  }),
  http.put('/api/v1/tasks/:id/status', async ({ params, request }) => {
    const body = (await request.json()) as { status_id: string }
    return moveStatus(String(params.id), body.status_id) ? ok({ id: params.id, status_id: body.status_id }) : HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Task tidak ditemukan' } }, { status: 404 })
  }),
  http.put('/api/v1/tasks/:id/completeness', async ({ params, request }) => {
    const body = (await request.json()) as { completeness: 'complete' | 'incomplete' }
    return setCompleteness(String(params.id), body.completeness) ? ok({ id: params.id, completeness: body.completeness }) : HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Task tidak ditemukan' } }, { status: 404 })
  }),
  http.put('/api/v1/tasks/:id/reorder', ({ params }) => ok({ id: params.id })),
  http.post('/api/v1/tasks/:id/comments', async ({ params, request }) => {
    const body = (await request.json()) as { body: string }
    const result = addComment(String(params.id), body.body)
    return result === null ? HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Task tidak ditemukan' } }, { status: 404 }) : ok(result)
  }),

  // Catch-all TERAKHIR (MSW memakai handler pertama yang cocok): endpoint yang tidak di-mock tidak
  // diteruskan ke API sungguhan -- token mock ditolak 401 dan interceptor menendang sesi mock ke /login.
  http.all('/api/v1/*', () => HttpResponse.json({ error: { code: 'MOCK_NOT_IMPLEMENTED', message: 'Endpoint belum di-mock' } }, { status: 404 })),
]
