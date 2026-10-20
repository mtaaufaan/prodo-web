import { http, HttpResponse } from 'msw'

import { mockContext, mockFollowedProjects, mockMembers, mockProjects, mockSprints, mockStatuses, mockTasks, mockWorkspace } from './editorFixtures'

import { decide, listApprovals } from './approvalsStore'
import { addComment, isOwnedByMe, listMine, moveStatus, setCompleteness } from './myTasksStore'
import * as account from './accountStore'
import { deleteMine, findMine, listMyAttachments, registerMyUpload, renameMine } from './myAttachmentsStore'
import { getMyHours, logHours } from './myTimesheetStore'
import { listNotifications, markAllRead, markNotificationRead } from './notificationsStore'
import {
  addAttachment,
  addChecklistItem,
  addTaskComment,
  createMockTask,
  deleteComment,
  editComment,
  findChecklistItem,
  listAttachments,
  listChecklist,
  listComments,
  removeChecklistItem,
  updateTaskFields,
} from './taskDetailStore'

const ok = (data: unknown) => HttpResponse.json({ data })
// Gerbang hak akses Editor di backend (S6E-06): task orang lain -> 403 NOT_YOUR_TASK.
const fail = (code: string, message: string, status: number) => HttpResponse.json({ error: { code, message } }, { status })
const notFound = () => fail('NOT_FOUND', 'Data tidak ditemukan', 404)
const COMMENT_FAIL: Record<string, [string, number, string]> = {
  NOT_FOUND: ['NOT_FOUND', 404, 'Task atau komentar tidak ditemukan'],
  FORBIDDEN: ['FORBIDDEN', 403, 'Anda tidak memiliki izin untuk aksi komentar ini.'],
  COMMENT_EDIT_LOCKED: ['COMMENT_EDIT_LOCKED', 422, 'Komentar hanya dapat diedit dalam 3 menit setelah dikirim.'],
}
const commentFail = (code: string) => fail(COMMENT_FAIL[code][0], COMMENT_FAIL[code][2], COMMENT_FAIL[code][1])
const notYourTask = () => HttpResponse.json({ error: { code: 'NOT_YOUR_TASK', message: 'Anda hanya dapat mengubah task yang ditugaskan kepada Anda.' } }, { status: 403 })

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

  // Pengaturan Akun Editor (S6E-13): profil, preferensi notifikasi, sesi, password, MFA -- berstate (accountStore.ts).
  http.get('/api/v1/users/me', () => ok(account.getProfile())),
  http.patch('/api/v1/users/me', async ({ request }) => ok(account.updateProfile((await request.json()) as never))),
  http.get('/api/v1/users/me/notification-preferences', () => ok(account.listPrefs())),
  http.patch('/api/v1/users/me/notification-preferences', async ({ request }) => {
    const b = (await request.json()) as { event_type: string; push: boolean; email: boolean }
    const hit = account.updatePref(b.event_type, b.push, b.email)
    return hit ? ok(hit) : notFound()
  }),
  http.get('/api/v1/auth/sessions', () => ok(account.listSessions())),
  http.delete('/api/v1/auth/sessions/:jti', ({ params }) => {
    account.revokeSession(String(params.jti))
    return ok(null)
  }),
  http.delete('/api/v1/auth/sessions', () => {
    account.revokeOthers()
    return ok(null)
  }),
  http.post('/api/v1/auth/password/change', async ({ request }) => {
    const b = (await request.json()) as { current_password: string; new_password: string }
    if (!b.current_password) return fail('VALIDATION_ERROR', 'Password saat ini wajib diisi.', 422)
    return ok({ message: 'Password diganti', revoked_other_sessions: account.revokeOthers() })
  }),
  http.post('/api/v1/auth/mfa/setup', () => ok({ totp_qr_url: 'otpauth://totp/PRODO:editor@prodo.local?secret=JBSWY3DPEHPK3PXP&issuer=PRODO', totp_secret: 'JBSWY3DPEHPK3PXP' })),
  http.post('/api/v1/auth/mfa/verify', async ({ request }) => {
    const b = (await request.json()) as { otp_code: string }
    if (!/^\d{6}$/.test(b.otp_code ?? '')) return fail('INVALID_OTP', 'Kode OTP harus 6 digit.', 422)
    account.setMfaEnabled(true)
    return ok({ mfa_enabled: true, backup_codes: account.newBackupCodes() })
  }),
  http.post('/api/v1/auth/mfa/backup-codes/regenerate', () => ok({ backup_codes: account.newBackupCodes() })),

  // Lonceng notifikasi Editor (S6E-13, US-034) -- berstate (notificationsStore.ts); API nyata di S6E-14.
  http.get('/api/v1/me/notifications', ({ request }) => {
    const q = new URL(request.url).searchParams
    return ok(listNotifications(Number(q.get('page') ?? 1), Number(q.get('per_page') ?? 10)))
  }),
  http.patch('/api/v1/me/notifications/:id/read', ({ params }) => (markNotificationRead(String(params.id)) ? ok({ id: params.id }) : notFound())),
  http.post('/api/v1/me/notifications/read-all', () => ok({ updated: markAllRead() })),

  // Kerangka Master UI Editor (S6E-01): sesi mock = akun Editor (lihat main.tsx).
  http.get('/api/v1/me/context', () => ok(mockContext)),
  http.get('/api/v1/me/projects', () => ok(mockFollowedProjects)),
  http.get('/api/v1/workspaces/:id', () => ok(mockWorkspace)),
  http.get('/api/v1/workspaces/:id/projects', () => ok(mockProjects)),
  http.get('/api/v1/projects/:id/statuses', () => ok(mockStatuses)),
  http.get('/api/v1/projects/:id/sprints', () => ok(mockSprints)),
  http.get('/api/v1/projects/:id/tasks', () => ok(mockTasks)),
  http.get('/api/v1/projects/:id/members', () => ok(mockMembers)),

  // Antrean Approval (S7A-03) -- berstate di memori (approvalsStore.ts); API nyata di S7A-04.
  http.get('/api/v1/me/approvals', ({ request }) => {
    const q = new URL(request.url).searchParams
    return ok(listApprovals(q.get('project_id') ?? '', q.get('view') === 'decided' ? 'decided' : 'pending', Number(q.get('page') ?? 1), Number(q.get('per_page') ?? 10)))
  }),
  http.post('/api/v1/tasks/:id/approval', async ({ params, request }) => {
    const body = (await request.json()) as { decision: 'approve' | 'reject'; note?: string }
    const out = decide(String(params.id), body.decision, body.note ?? '')
    if (out.ok) return ok(out.result)
    return fail(out.code, out.message, out.code === 'NOT_FOUND' ? 404 : 422)
  }),

  // Task Saya + komentar (S6E-03) -- berstate di memori (myTasksStore.ts).
  http.get('/api/v1/me/tasks', ({ request }) => {
    const q = new URL(request.url).searchParams
    return ok(listMine(q.get('project_id') ?? '', q.get('view') === 'following' ? 'following' : 'assigned', Number(q.get('page') ?? 1), Number(q.get('per_page') ?? 10)))
  }),
  http.put('/api/v1/tasks/:id/status', async ({ params, request }) => {
    if (!isOwnedByMe(String(params.id))) return notYourTask()
    const body = (await request.json()) as { status_id: string }
    return moveStatus(String(params.id), body.status_id) ? ok({ id: params.id, status_id: body.status_id }) : HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Task tidak ditemukan' } }, { status: 404 })
  }),
  http.put('/api/v1/tasks/:id/completeness', async ({ params, request }) => {
    if (!isOwnedByMe(String(params.id))) return notYourTask()
    const body = (await request.json()) as { completeness: 'complete' | 'incomplete' }
    return setCompleteness(String(params.id), body.completeness) ? ok({ id: params.id, completeness: body.completeness }) : HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Task tidak ditemukan' } }, { status: 404 })
  }),
  http.put('/api/v1/tasks/:id/reorder', ({ params }) => (isOwnedByMe(String(params.id)) ? ok({ id: params.id }) : notYourTask())),
  http.post('/api/v1/projects/:id/tasks/bulk-status', () => HttpResponse.json({ error: { code: 'BULK_NOT_ALLOWED', message: 'Role Anda tidak dapat memakai aksi bulk.' } }, { status: 403 })),
  http.post('/api/v1/tasks/:id/comments', async ({ params, request }) => {
    const body = (await request.json()) as { body: string }
    const result = addComment(String(params.id), body.body)
    if (result === null) return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Task tidak ditemukan' } }, { status: 404 })
    return ok({ ...result, comment: addTaskComment(String(params.id), body.body) })
  }),

  // Task Detail + Tambah Task (S6E-07). Gerbang Editor meniru backend S6E-06: mengubah task orang lain -> 403.
  http.get('/api/v1/tasks/:id', ({ params }) => {
    const t = mockTasks.find((x) => x.id === params.id)
    return t ? ok({ ...t, logged_minutes: 135 }) : notFound()
  }),
  http.put('/api/v1/tasks/:id', async ({ params, request }) => {
    if (!isOwnedByMe(String(params.id))) return notYourTask()
    return updateTaskFields(String(params.id), (await request.json()) as never) ? ok({ id: params.id }) : notFound()
  }),
  http.delete('/api/v1/tasks/:id', () => fail('FORBIDDEN', 'Hanya Admin Workspace atau Project Manager yang dapat menghapus task.', 403)),
  http.post('/api/v1/projects/:id/tasks', async ({ params, request }) => {
    const body = (await request.json()) as { story_points?: number | null }
    // Meniru backend S6E-08: Editor hanya boleh mengisi story point bila project mengizinkan.
    const allowSP = mockProjects.find((p) => p.id === params.id)?.allow_editor_story_points ?? false
    if (body.story_points != null && !allowSP) return fail('STORY_POINTS_NOT_ALLOWED', 'Project ini tidak mengizinkan Editor mengisi story point.', 403)
    return ok(createMockTask(String(params.id), body as never))
  }),
  http.get('/api/v1/tasks/:id/comments', ({ params }) => ok(listComments(String(params.id)))),
  http.patch('/api/v1/comments/:id', async ({ params, request }) => {
    const res = editComment(String(params.id), ((await request.json()) as { body: string }).body)
    return typeof res === 'string' ? commentFail(res) : ok(res)
  }),
  http.delete('/api/v1/comments/:id', ({ params }) => {
    const res = deleteComment(String(params.id))
    return res === true ? ok({ id: params.id }) : commentFail(res)
  }),
  http.get('/api/v1/tasks/:id/checklist-items', ({ params }) => ok(listChecklist(String(params.id)))),
  http.post('/api/v1/tasks/:id/checklist-items', async ({ params, request }) =>
    isOwnedByMe(String(params.id)) ? ok(addChecklistItem(String(params.id), ((await request.json()) as { title: string }).title)) : notYourTask(),
  ),
  http.patch('/api/v1/tasks/checklist-items/:id', async ({ params, request }) => {
    const item = findChecklistItem(String(params.id))
    if (!item) return notFound()
    if (!isOwnedByMe(item.task_id)) return notYourTask()
    Object.assign(item, await request.json())
    return ok({ id: item.id })
  }),
  http.delete('/api/v1/tasks/checklist-items/:id', ({ params }) => {
    const item = findChecklistItem(String(params.id))
    if (item && !isOwnedByMe(item.task_id)) return notYourTask()
    removeChecklistItem(String(params.id))
    return ok(null)
  }),
  http.get('/api/v1/tasks/:id/attachments', ({ params }) => ok(listAttachments(String(params.id)))),
  http.post('/api/v1/tasks/:id/attachments', async ({ params, request }) => {
    if (!isOwnedByMe(String(params.id))) return notYourTask()
    const file = (await request.formData()).get('file') as File | null
    const created = addAttachment(String(params.id), file?.name ?? 'berkas', file?.size ?? 0)
    registerMyUpload(created)
    return ok(created)
  }),
  // Lampiran Saya (S6E-11). Gerbang kepemilikan meniru backend S6E-12: file orang lain -> 403.
  http.get('/api/v1/me/attachments', () => ok(listMyAttachments())),
  http.get('/api/v1/attachments/:id/download', ({ params }) =>
    findMine(String(params.id)) ? new HttpResponse('isi berkas tiruan', { headers: { 'Content-Type': 'application/octet-stream' } }) : notFound(),
  ),
  http.put('/api/v1/attachments/:id', async ({ params, request }) => {
    const res = renameMine(String(params.id), ((await request.json()) as { display_name: string }).display_name)
    if (res === 'NOT_FOUND') return notFound()
    return res === true ? ok({ id: params.id }) : fail('FORBIDDEN', 'Anda hanya dapat mengubah lampiran yang Anda unggah.', 403)
  }),
  http.delete('/api/v1/attachments/:id', ({ params }) => {
    const res = deleteMine(String(params.id))
    if (res === 'NOT_FOUND') return notFound()
    return res === true ? ok({ id: params.id }) : fail('FORBIDDEN', 'Anda hanya dapat menghapus lampiran yang Anda unggah.', 403)
  }),
  http.get('/api/v1/workspaces/:id/documents/quota', () => ok({ quota_bytes: 10 * 1024 ** 3, used_bytes: 2 * 1024 ** 3, retention_days: 30, per_project: [] })),
  // Pelengkap Task Detail yang belum punya data tiruan -- kosong saja.
  http.get('/api/v1/tasks/:id/dependencies', () => ok({ predecessors: [], successors: [] })),
  http.get('/api/v1/tasks/:id/pic-history', () => ok([])),
  http.get('/api/v1/tasks/:id/status-sessions', () => ok([])),
  http.get('/api/v1/tasks/:id/versions', () => ok([])),
  http.get('/api/v1/tasks/:id/activity', () => ok({ items: [], total: 0 })),
  http.get('/api/v1/tasks/:id/time-entries', () => ok({ items: [], total: 0 })),
  http.get('/api/v1/tasks/:id/time-entries/active', () => ok(null)),

  // Timesheet Editor (S6E-09). Gerbang meniru backend S6E-10: task orang lain 403, jam di luar 0-12 -> 422.
  http.get('/api/v1/me/timesheets', ({ request }) => {
    const q = new URL(request.url).searchParams
    return ok(getMyHours(q.get('view') === 'history' ? 'history' : 'week', Number(q.get('page') ?? 1), Number(q.get('per_page') ?? 10)))
  }),
  http.post('/api/v1/tasks/:id/time-log', async ({ params, request }) => {
    const body = (await request.json()) as { hours: number; note?: string }
    const res = logHours(String(params.id), body.hours, body.note ?? '')
    if (res === 'NOT_YOUR_TASK') return fail('NOT_YOUR_TASK', 'Anda hanya dapat mencatat waktu pada task yang ditugaskan kepada Anda.', 403)
    if (res === 'VALIDATION_ERROR') return fail('VALIDATION_ERROR', 'Jam harus lebih dari 0 dan maksimal 12.', 422)
    if (res === 'NOT_FOUND') return notFound()
    return ok(res)
  }),

  // Catch-all TERAKHIR (MSW memakai handler pertama yang cocok): endpoint yang tidak di-mock tidak
  // diteruskan ke API sungguhan -- token mock ditolak 401 dan interceptor menendang sesi mock ke /login.
  http.all('/api/v1/*', () => HttpResponse.json({ error: { code: 'MOCK_NOT_IMPLEMENTED', message: 'Endpoint belum di-mock' } }, { status: 404 })),
]
