import type { Attachment } from '@/features/attachments/types'
import type { TaskComment } from '@/features/tasks/comments'
import type { Task, TaskActivityEntry, TaskChecklistItem, TaskFormValues } from '@/features/tasks/types'

import { MOCK_USER, mockMembers, mockStatuses, mockTasks } from './editorFixtures'
import { isOwnedByMe } from './myTasksStore'

// Data tiruan Task Detail + Tambah Task Editor (S6E-07) -- BERSTATE di memori supaya modal bisa dicoba tanpa
// backend: komentar, sub-task, lampiran, edit task, dan task baru. Dibuang di S6E-08 saat izin Editor di
// backend (buat task, lampiran, sub-task) tersambung.
// Pengguna sesi mock mengikuti role (VITE_MOCK_ROLE): komentar/lampiran miliknya bisa diubah/dihapus sendiri.
const ME = MOCK_USER.id
const EDIT_WINDOW_MS = 3 * 60 * 1000
const nameOf = (id: string) => (id === MOCK_USER.id ? MOCK_USER.display_name : (mockMembers.find((m) => m.user_id === id)?.display_name ?? 'Anggota'))
let seq = 1000
const nextId = (p: string) => `${p}-${++seq}`

const comments = new Map<string, TaskComment[]>()
const checklist = new Map<string, TaskChecklistItem[]>()
const attachments = new Map<string, Attachment[]>()

function seedComments(taskId: string): TaskComment[] {
  return [
    { id: `${taskId}-c1`, task_id: taskId, user_id: 'mock-budi', author_name: 'Budi', body: 'Sudah saya cek, tinggal menunggu data dari tim API.', is_edited: false, edited_at: null, created_at: '2026-10-14T03:00:00Z', can_edit: false, can_delete: false },
  ]
}

// can_edit/can_delete dihitung tiap baca, seperti server: pengirim dalam jendela edit 3 menit; hapus oleh pengirim.
function view(c: TaskComment): TaskComment {
  const mine = c.user_id === ME
  return { ...c, can_edit: mine && Date.now() - Date.parse(c.created_at) < EDIT_WINDOW_MS, can_delete: mine }
}

export function listComments(taskId: string): TaskComment[] {
  if (!comments.has(taskId)) comments.set(taskId, seedComments(taskId))
  return comments.get(taskId)!.map(view)
}

export function addTaskComment(taskId: string, body: string): TaskComment {
  const c: TaskComment = { id: nextId('c'), task_id: taskId, user_id: ME, author_name: nameOf(ME), body, is_edited: false, edited_at: null, created_at: new Date().toISOString(), can_edit: true, can_delete: true }
  comments.set(taskId, [...(comments.get(taskId) ?? seedComments(taskId)), c])
  return c
}

export type CommentFail = 'NOT_FOUND' | 'FORBIDDEN' | 'COMMENT_EDIT_LOCKED'

function findComment(id: string): TaskComment | undefined {
  for (const list of comments.values()) {
    const hit = list.find((c) => c.id === id)
    if (hit) return hit
  }
  return undefined
}

export function editComment(id: string, body: string): TaskComment | CommentFail {
  const c = findComment(id)
  if (!c) return 'NOT_FOUND'
  if (c.user_id !== ME) return 'FORBIDDEN'
  if (Date.now() - Date.parse(c.created_at) >= EDIT_WINDOW_MS) return 'COMMENT_EDIT_LOCKED'
  c.body = body
  c.is_edited = true
  c.edited_at = new Date().toISOString()
  return view(c)
}

export function deleteComment(id: string): true | CommentFail {
  const c = findComment(id)
  if (!c) return 'NOT_FOUND'
  if (c.user_id !== ME) return 'FORBIDDEN'
  comments.set(c.task_id, comments.get(c.task_id)!.filter((x) => x.id !== id))
  return true
}

export function listChecklist(taskId: string): TaskChecklistItem[] {
  if (!checklist.has(taskId)) {
    checklist.set(taskId, [
      { id: `${taskId}-s1`, task_id: taskId, title: 'Siapkan data uji', is_done: true, position: 1 },
      { id: `${taskId}-s2`, task_id: taskId, title: 'Verifikasi hasil', is_done: false, position: 2 },
    ])
  }
  return checklist.get(taskId)!
}

export function addChecklistItem(taskId: string, title: string): TaskChecklistItem {
  const list = listChecklist(taskId)
  const item: TaskChecklistItem = { id: nextId('s'), task_id: taskId, title, is_done: false, position: list.length + 1 }
  list.push(item)
  return item
}

export function findChecklistItem(itemId: string): TaskChecklistItem | undefined {
  for (const list of checklist.values()) {
    const hit = list.find((i) => i.id === itemId)
    if (hit) return hit
  }
  return undefined
}

export function removeChecklistItem(itemId: string) {
  for (const [k, list] of checklist) checklist.set(k, list.filter((i) => i.id !== itemId))
}

export function listAttachments(taskId: string): Attachment[] {
  return attachments.get(taskId) ?? []
}

export function addAttachment(taskId: string, name: string, size: number): Attachment {
  const a: Attachment = {
    id: nextId('a'), task_id: taskId, uploader_id: ME, uploader_name: nameOf(ME), uploader_email: `${ME}@prodo.local`, original_name: name, display_name: name,
    mime_type: 'application/octet-stream', size_bytes: size, is_image: false, created_at: new Date().toISOString(), deleted_at: null, purge_scheduled_at: null,
  }
  attachments.set(taskId, [...listAttachments(taskId), a])
  return a
}

// ownsTask -- gerbang S6E-06 untuk task yang diubah lewat modal (task orang lain -> 403 NOT_YOUR_TASK).
export const ownsTask = isOwnedByMe

export function updateTaskFields(taskId: string, v: TaskFormValues): boolean {
  const t = mockTasks.find((x) => x.id === taskId)
  if (!t) return false
  t.title = v.title
  t.description = v.description ?? null
  t.priority = v.priority
  t.start_date = v.start_date || null
  t.due_date = v.due_date || null
  t.estimated_hours = v.estimated_hours ?? null
  t.story_points = v.story_points ?? null
  return true
}

export function createMockTask(projectId: string, v: TaskFormValues): Task {
  const backlog = mockStatuses.find((s) => s.name === 'BACKLOG') ?? mockStatuses[0]
  const n = mockTasks.length + 1
  const owners = (v.assignee_ids ?? []).map((id) => mockMembers.find((m) => m.user_id === id)).filter((m): m is NonNullable<typeof m> => Boolean(m))
  const id = nextId(`${projectId}-new`)
  const t: Task = {
    id, project_id: projectId, sprint_id: v.sprint_id ?? null, sprint_name: null, parent_task_id: null, status_id: backlog.id, status_name: backlog.name, status_color: backlog.color_token,
    title: v.title, description: v.description ?? null, priority: v.priority, completeness: 'incomplete', start_date: v.start_date || null, due_date: v.due_date || null,
    estimated_hours: v.estimated_hours ?? null, story_points: v.story_points ?? null, task_code: `QST-${String(n).padStart(3, '0')}`, created_by: ME,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), completed_at: null, is_blocked: false, regression_count: 0, position: n,
    assignees: owners.map((m) => ({ user_id: m.user_id, display_name: m.display_name ?? '', email: m.email, role: 'lead' as const })),
    active_pics: owners.map((m, i) => ({
      id: `${id}-pic${i}`, task_id: id, status_id: backlog.id, status_name: backlog.name, user_id: m.user_id, user_name: m.display_name ?? '', user_email: m.email,
      is_active: true, acknowledged_at: null, activated_at: new Date().toISOString(), deactivated_at: null, assigned_by: null,
    })),
  }
  mockTasks.push(t)
  return t
}

// Aktivitas task (tab AKTIVITAS): hanya yang tercipta di sesi mock (mis. keputusan approval, S7A-09).
const activity = new Map<string, TaskActivityEntry[]>()

export function listActivity(taskId: string): TaskActivityEntry[] {
  return (activity.get(taskId) ?? []).slice().reverse()
}

export function addActivity(taskId: string, action: string, before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const entry: TaskActivityEntry = {
    id: nextId('act'), action, actor_id: ME, actor_name: MOCK_USER.display_name, actor_email: MOCK_USER.email, actor_role: 'approver',
    state_before: before, state_after: after, metadata: null, logged_at: new Date().toISOString(),
  }
  activity.set(taskId, [...(activity.get(taskId) ?? []), entry])
}
