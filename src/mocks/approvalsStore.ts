import { REJECT_NOTE_MIN } from '@/features/approvals/types'
import type { ApprovalItem, ApprovalsPage, ApprovalView, DecisionResult } from '@/features/approvals/types'
import type { TaskPriority } from '@/features/tasks/types'

// Data tiruan Antrean Approval (S7A-03) -- BERSTATE di memori: keputusan memindahkan task ke DONE /
// IN PROGRESS dan masuk riwayat "Sudah Diputuskan" (permanen selama sesi mock). Hanya dipakai `npm run dev:mock`;
// aplikasi nyata memakai GET /me/approvals dan POST /tasks/:id/approval (backend S7A-04).
const COLORS: Record<string, string> = { 'UNDER REVIEW': 'violet', 'IN PROGRESS': 'signal', DONE: 'mint', BACKLOG: 'grey' }

interface Seed {
  title: string
  status: string
  priority: TaskPriority
  sprint: string | null
  due: string
  pics: string[]
  comments: number
  sub: [number, number]
  hours: [number, number]
  decision?: 'approved' | 'rejected'
}

function row(projectId: string, prefix: string, n: number, s: Seed): ApprovalItem {
  return {
    approval_id: s.decision ? `${projectId}-apv-${n}` : null,
    task_id: `${projectId}-ap-${n}`,
    task_code: `${prefix}-${String(100 + n)}`,
    title: s.title,
    project_id: projectId,
    status_name: s.status,
    status_color: COLORS[s.status] ?? 'grey',
    priority: s.priority,
    sprint_name: s.sprint,
    due_date: s.due,
    pic_names: s.pics,
    comment_count: s.comments,
    sub_total: s.sub[1],
    sub_done: s.sub[0],
    logged_hours: s.hours[0],
    estimate_hours: s.hours[1],
    decision: s.decision ?? null,
    decided_at: s.decision ? '2026-10-18T09:30:00Z' : null,
    decision_note: s.decision === 'rejected' ? 'Perlu perbaikan sebelum dirilis.' : null,
  }
}

const QUEST: Seed[] = [
  { title: 'Rekonsiliasi vendor Q3', status: 'UNDER REVIEW', priority: 'high', sprint: 'Sprint 1', due: '2026-10-12', pics: ['Sinta A.'], comments: 3, sub: [4, 4], hours: [9, 8] },
  { title: 'Review desain profil', status: 'UNDER REVIEW', priority: 'low', sprint: 'Sprint 1', due: '2026-10-28', pics: ['Citra'], comments: 3, sub: [4, 4], hours: [5, 5] },
  { title: 'Uji beban server', status: 'UNDER REVIEW', priority: 'high', sprint: 'Sprint 1', due: '2026-10-15', pics: ['Eka Editor'], comments: 5, sub: [2, 2], hours: [9, 8] },
  { title: 'Integrasi gateway pembayaran', status: 'UNDER REVIEW', priority: 'critical', sprint: 'Sprint 1', due: '2026-10-25', pics: ['Budi'], comments: 6, sub: [5, 6], hours: [14, 16] },
  { title: 'Migrasi data pemain lama', status: 'UNDER REVIEW', priority: 'medium', sprint: 'Sprint 1', due: '2026-11-02', pics: ['Citra', 'Budi'], comments: 2, sub: [3, 3], hours: [6, 10] },
  { title: 'Perbarui halaman bantuan', status: 'UNDER REVIEW', priority: 'low', sprint: 'Sprint 2', due: '2026-11-05', pics: ['Eka Editor'], comments: 0, sub: [0, 0], hours: [2, 3] },
  { title: 'Optimasi waktu muat peta', status: 'UNDER REVIEW', priority: 'medium', sprint: 'Sprint 2', due: '2026-11-08', pics: ['Budi'], comments: 1, sub: [2, 4], hours: [5, 9] },
  { title: 'Standarisasi pesan galat API', status: 'UNDER REVIEW', priority: 'medium', sprint: 'Sprint 2', due: '2026-11-10', pics: ['Citra'], comments: 4, sub: [3, 3], hours: [7, 6] },
  { title: 'Audit izin akses admin', status: 'UNDER REVIEW', priority: 'high', sprint: 'Sprint 2', due: '2026-11-12', pics: ['Eka Editor'], comments: 2, sub: [1, 2], hours: [3, 5] },
  { title: 'Rancang ulang layar leaderboard', status: 'UNDER REVIEW', priority: 'low', sprint: 'Sprint 2', due: '2026-11-14', pics: ['Citra'], comments: 0, sub: [0, 0], hours: [0, 4] },
  { title: 'Cadangan basis data harian', status: 'UNDER REVIEW', priority: 'critical', sprint: 'Sprint 2', due: '2026-11-18', pics: ['Budi'], comments: 3, sub: [2, 2], hours: [4, 4] },
  { title: 'Dokumentasi alur onboarding', status: 'UNDER REVIEW', priority: 'low', sprint: null, due: '2026-11-20', pics: ['Eka Editor'], comments: 1, sub: [0, 0], hours: [1, 2] },
  { title: 'Penyesuaian tema gelap', status: 'UNDER REVIEW', priority: 'medium', sprint: 'Sprint 2', due: '2026-11-22', pics: ['Citra'], comments: 2, sub: [4, 5], hours: [6, 6] },
  { title: 'Implementasi daftar quest', status: 'IN PROGRESS', priority: 'high', sprint: 'Sprint 1', due: '2026-10-16', pics: ['Eka Editor', 'Budi'], comments: 2, sub: [2, 5], hours: [6, 8] },
  { title: 'Perbaiki bug sinkronisasi', status: 'IN PROGRESS', priority: 'critical', sprint: 'Sprint 1', due: '2026-10-10', pics: ['Eka Editor'], comments: 4, sub: [1, 3], hours: [11, 8] },
  { title: 'Rilis build internal', status: 'DONE', priority: 'medium', sprint: 'Sprint 0', due: '2026-10-05', pics: ['Eka Editor'], comments: 1, sub: [3, 3], hours: [7.5, 8] },
  { title: 'Siapkan lingkungan staging', status: 'DONE', priority: 'high', sprint: 'Sprint 0', due: '2026-10-03', pics: ['Budi'], comments: 0, sub: [2, 2], hours: [6, 6], decision: 'approved' },
  { title: 'Perbaiki skema notifikasi', status: 'IN PROGRESS', priority: 'medium', sprint: 'Sprint 1', due: '2026-10-14', pics: ['Citra'], comments: 3, sub: [1, 3], hours: [4, 6], decision: 'rejected' },
  { title: 'Audit aksesibilitas', status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 2', due: '2026-11-20', pics: ['Eka Editor'], comments: 0, sub: [0, 0], hours: [0, 5] },
]
const PRODO: Seed[] = [
  { title: 'Tinjau kontrak vendor', status: 'UNDER REVIEW', priority: 'high', sprint: 'Sprint 1', due: '2026-10-18', pics: ['Dewi'], comments: 2, sub: [0, 0], hours: [2, 3] },
  { title: 'Siapkan template laporan', status: 'UNDER REVIEW', priority: 'medium', sprint: 'Sprint 1', due: '2026-10-30', pics: ['Eka Editor'], comments: 1, sub: [1, 2], hours: [3, 6] },
  { title: 'Rapikan arsip dokumen', status: 'UNDER REVIEW', priority: 'low', sprint: 'Sprint 1', due: '2026-11-04', pics: ['Dewi'], comments: 0, sub: [0, 0], hours: [1, 2] },
  { title: 'Susun anggaran kuartal berikutnya', status: 'IN PROGRESS', priority: 'medium', sprint: 'Sprint 1', due: '2026-11-10', pics: ['Dewi'], comments: 0, sub: [0, 3], hours: [0, 6] },
]

const store = new Map<string, ApprovalItem[]>([
  ['mock-proj-quest', QUEST.map((s, i) => row('mock-proj-quest', 'QST', i + 1, s))],
  ['mock-proj-prodo', PRODO.map((s, i) => row('mock-proj-prodo', 'PRD', i + 1, s))],
])

const isLate = (t: ApprovalItem, today: string) => t.due_date !== null && t.due_date < today && t.status_name !== 'DONE'

// Bentuk sama dengan GET /me/approvals (kontrak usulan S7A-04): satu halaman + total + 4 kartu.
export function listApprovals(projectId: string, view: ApprovalView, page: number, perPage: number, today: string = new Date().toISOString().slice(0, 10)): ApprovalsPage {
  const all = store.get(projectId) ?? []
  const pending = all.filter((t) => t.status_name === 'UNDER REVIEW' && t.decision === null)
  // Riwayat: keputusan terbaru lebih dulu (decided_at menurun).
  const decided = all.filter((t) => t.decision !== null).sort((x, y) => (y.decided_at ?? '').localeCompare(x.decided_at ?? ''))
  const rows = view === 'decided' ? decided : pending
  return {
    items: rows.slice((page - 1) * perPage, page * perPage),
    total: rows.length,
    page,
    per_page: perPage,
    stats: { pending: pending.length, decided: decided.length, total_tasks: all.length, late: all.filter((t) => isLate(t, today)).length },
  }
}

export type DecideOutcome = { ok: true; result: DecisionResult } | { ok: false; code: 'NOT_FOUND' | 'NOT_IN_REVIEW' | 'VALIDATION_ERROR'; message: string }

// decide -- meniru gerbang backend: hanya task UNDER REVIEW yang belum diputuskan; tolak wajib beralasan.
export function decide(taskId: string, decision: 'approve' | 'reject', note: string): DecideOutcome {
  const t = [...store.values()].flat().find((x) => x.task_id === taskId)
  if (!t) return { ok: false, code: 'NOT_FOUND', message: 'Task tidak ditemukan' }
  if (t.status_name !== 'UNDER REVIEW' || t.decision !== null) return { ok: false, code: 'NOT_IN_REVIEW', message: 'Task tidak berstatus UNDER REVIEW' }
  const n = note.trim()
  if (decision === 'reject' && n.length < REJECT_NOTE_MIN) return { ok: false, code: 'VALIDATION_ERROR', message: `Alasan penolakan minimal ${REJECT_NOTE_MIN} karakter.` }
  const approved = decision === 'approve'
  t.status_name = approved ? 'DONE' : 'IN PROGRESS'
  t.status_color = COLORS[t.status_name]
  t.decision = approved ? 'approved' : 'rejected'
  t.approval_id = `${t.task_id}-apv`
  t.decided_at = new Date().toISOString()
  t.decision_note = n || null
  return { ok: true, result: { task_id: t.task_id, task_code: t.task_code, status_name: t.status_name, decision: t.decision } }
}
