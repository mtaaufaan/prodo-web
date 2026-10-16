import type { MyTask, MyTaskNextStatus, MyTasksPage, MyTaskView, PostCommentResult } from '@/features/my-tasks/types'
import type { TaskPriority } from '@/features/tasks/types'

import { mockStatuses, mockTasks } from './editorFixtures'

// Data tiruan Task Saya (S6E-03) -- BERSTATE di memori: pindah status dan
// komentar mengubah baris, supaya halaman bisa dicoba tanpa backend. Dibuang
// di S6E-04 saat endpoint /me/tasks dan komentar nyata tersambung.
const ME = 'Eka Editor'

// Urutan status project mock; DONE terakhir (tanpa status berikutnya).
function nextOf(statusId: string): MyTaskNextStatus | null {
  const i = mockStatuses.findIndex((s) => s.id === statusId)
  const n = mockStatuses[i + 1]
  return n ? { id: n.id, name: n.name, require_pic: n.require_pic } : null
}

interface Seed {
  code: string
  title: string
  status: string
  priority: TaskPriority
  sprint: string | null
  due: string
  pics: string[]
  comments: number
  sub: [number, number]
  hours: [number, number]
  mine: boolean
  followed: boolean
  late?: boolean
}

function row(projectId: string, n: number, s: Seed): MyTask {
  const st = mockStatuses.find((x) => x.name === s.status) ?? mockStatuses[0]
  return {
    task_id: `${projectId}-mt-${n}`,
    task_code: s.code,
    title: s.title,
    project_id: projectId,
    status_id: st.id,
    status_name: st.name,
    status_color: st.color_token,
    priority: s.priority,
    sprint_name: s.sprint,
    due_date: s.due,
    pic_names: s.pics,
    comment_count: s.comments,
    sub_total: s.sub[1],
    sub_done: s.sub[0],
    logged_hours: s.hours[0],
    estimate_hours: s.hours[1],
    is_mine: s.mine,
    is_followed: s.followed,
    is_late: Boolean(s.late),
    next_status: nextOf(st.id),
  }
}

const QUEST: Seed[] = [
  { code: 'QST-001', title: 'Rancang layar login', status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 1', due: '2026-10-30', pics: [ME], comments: 0, sub: [0, 0], hours: [0, 6], mine: true, followed: false },
  { code: 'QST-002', title: 'Implementasi daftar quest', status: 'IN PROGRESS', priority: 'high', sprint: 'Sprint 1', due: '2026-10-16', pics: [ME, 'Budi'], comments: 2, sub: [2, 5], hours: [6, 8], mine: true, followed: true },
  { code: 'QST-003', title: 'Perbaiki bug sinkronisasi', status: 'IN PROGRESS', priority: 'critical', sprint: 'Sprint 1', due: '2026-10-10', pics: [ME], comments: 4, sub: [1, 3], hours: [11, 8], mine: true, followed: true, late: true },
  { code: 'QST-004', title: 'Review desain profil', status: 'UNDER REVIEW', priority: 'low', sprint: 'Sprint 1', due: '2026-10-20', pics: ['Citra'], comments: 3, sub: [4, 4], hours: [5, 5], mine: false, followed: true },
  { code: 'QST-005', title: 'Rilis build internal', status: 'DONE', priority: 'medium', sprint: 'Sprint 0', due: '2026-10-05', pics: [ME], comments: 1, sub: [3, 3], hours: [7.5, 8], mine: true, followed: true },
  { code: 'QST-006', title: 'Susun dokumentasi API', status: 'IN PROGRESS', priority: 'medium', sprint: null, due: '2026-11-02', pics: [ME], comments: 0, sub: [0, 0], hours: [1.5, 4], mine: true, followed: false },
  { code: 'QST-007', title: 'Optimasi query leaderboard', status: 'BACKLOG', priority: 'high', sprint: 'Sprint 2', due: '2026-11-10', pics: [ME], comments: 0, sub: [0, 2], hours: [0, 10], mine: true, followed: false },
  { code: 'QST-008', title: 'Uji beban server', status: 'UNDER REVIEW', priority: 'high', sprint: 'Sprint 1', due: '2026-10-12', pics: [ME], comments: 5, sub: [2, 2], hours: [9, 8], mine: true, followed: true, late: true },
  { code: 'QST-009', title: 'Migrasi aset gambar', status: 'IN PROGRESS', priority: 'low', sprint: 'Sprint 2', due: '2026-11-15', pics: [ME], comments: 0, sub: [0, 0], hours: [0, 3], mine: true, followed: false },
  { code: 'QST-010', title: 'Audit aksesibilitas', status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 2', due: '2026-11-20', pics: [ME], comments: 0, sub: [0, 0], hours: [0, 5], mine: true, followed: false },
  { code: 'QST-011', title: 'Notifikasi push', status: 'IN PROGRESS', priority: 'high', sprint: 'Sprint 2', due: '2026-11-25', pics: [ME], comments: 1, sub: [1, 4], hours: [2, 12], mine: true, followed: true },
  { code: 'QST-012', title: 'Rapikan konfigurasi CI', status: 'BACKLOG', priority: 'low', sprint: null, due: '2026-12-01', pics: [ME], comments: 0, sub: [0, 0], hours: [0, 2], mine: true, followed: false },
]
const PRODO: Seed[] = [
  { code: 'PRD-001', title: 'Siapkan template laporan', status: 'IN PROGRESS', priority: 'medium', sprint: 'Sprint 1', due: '2026-10-22', pics: [ME], comments: 1, sub: [1, 2], hours: [3, 6], mine: true, followed: true },
  { code: 'PRD-002', title: 'Tinjau kontrak vendor', status: 'UNDER REVIEW', priority: 'high', sprint: 'Sprint 1', due: '2026-10-18', pics: ['Dewi'], comments: 2, sub: [0, 0], hours: [2, 3], mine: false, followed: true },
]

const store = new Map<string, MyTask[]>([
  ['mock-proj-quest', QUEST.map((s, i) => row('mock-proj-quest', i + 1, s))],
  ['mock-proj-prodo', PRODO.map((s, i) => row('mock-proj-prodo', i + 1, s))],
])

// Bentuk sama dengan GET /me/tasks (service.MyTaskService): satu halaman + total + kartu dari task "saya".
export function listMine(projectId: string, view: MyTaskView, page: number, perPage: number): MyTasksPage {
  const all = store.get(projectId) ?? []
  const rows = all.filter((t) => (view === 'following' ? t.is_followed : t.is_mine))
  const mine = all.filter((t) => t.is_mine)
  return {
    items: rows.slice((page - 1) * perPage, page * perPage),
    total: rows.length,
    page,
    per_page: perPage,
    stats: {
      total: mine.length,
      running: mine.filter((t) => !['DONE', 'BACKLOG', 'CANCELED'].includes(t.status_name)).length,
      logged_hours: Math.round(mine.reduce((sum, t) => sum + t.logged_hours, 0) * 10) / 10,
      late: mine.filter((t) => t.is_late).length,
    },
  }
}

function find(taskId: string): MyTask | undefined {
  for (const rows of store.values()) {
    const hit = rows.find((t) => t.task_id === taskId)
    if (hit) return hit
  }
  return undefined
}

export function moveStatus(taskId: string, statusId: string): boolean {
  const t = find(taskId)
  const st = mockStatuses.find((s) => s.id === statusId)
  if (!t || !st) return false
  t.status_id = st.id
  t.status_name = st.name
  t.status_color = st.color_token
  t.next_status = nextOf(st.id)
  // Board memakai objek Task yang sama id-nya (editorFixtures.mockTasks) -- sinkronkan.
  const board = mockTasks.find((x) => x.id === taskId)
  if (board) {
    board.status_id = st.id
    board.status_name = st.name
    board.status_color = st.color_token
    board.completeness = st.name === 'BACKLOG' ? (board.completeness ?? 'complete') : null
  }
  return true
}

export function setCompleteness(taskId: string, completeness: 'complete' | 'incomplete'): boolean {
  const board = mockTasks.find((x) => x.id === taskId)
  if (!board) return false
  board.completeness = completeness
  return true
}

// Anggota project mock yang bisa di-mention (nama depan huruf kecil) -- meniru resolusi server.
const MENTIONABLE: Record<string, string> = { budi: 'Budi', citra: 'Citra' }

export function addComment(taskId: string, body: string): PostCommentResult | null {
  const t = find(taskId)
  if (!t) return null
  t.comment_count += 1
  t.is_followed = true
  const tokens = Array.from(body.matchAll(/(?:^|[^\w.])@([A-Za-z][\w.]*)/g), (m) => m[1].toLowerCase().replace(/\.+$/, ''))
  const mentions = [...new Set(tokens)].filter((k) => MENTIONABLE[k]).map((k) => MENTIONABLE[k])
  return { comment_count: t.comment_count, mentions, notified: mentions.length }
}
