import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Capabilities } from '@/features/context/types'
import type { CustomStatus, Task } from '@/features/tasks/types'
import { ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

import TaskDetailModal from './TaskDetailModal'

// Semua hook data diganti hasil kosong; hanya yang menentukan tampilan modal ini yang diisi.
const { state, empty, decide } = vi.hoisted(() => ({
  state: { task: undefined as unknown, sessions: [] as unknown[] },
  decide: { fn: undefined as unknown as (a: unknown) => Promise<unknown> },
  empty: () => ({ data: undefined, isLoading: false, isPending: false, isError: false, mutate: () => undefined, mutateAsync: () => Promise.resolve() }),
}))

vi.mock('@/features/tasks/hooks', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/features/tasks/hooks')
  const overrides: Record<string, unknown> = {
    useTask: () => ({ data: state.task, isLoading: false }),
    useTaskStatusSessions: () => ({ data: state.sessions }),
    useTaskChecklistItems: () => ({ data: [{ id: 'i1', task_id: 't', title: 'Cek hasil', is_done: false, position: 1 }] }),
  }
  return new Proxy(actual, {
    get: (t, k: string) => (k in overrides ? overrides[k] : k.startsWith('use') ? empty : t[k]),
    has: () => true,
  })
})
vi.mock('@/features/approvals/hooks', () => ({ useDecideApproval: () => ({ mutateAsync: (a: unknown) => decide.fn(a), isPending: false }) }))
vi.mock('@/features/attachments/hooks', () => ({
  useTaskAttachments: () => ({ data: [] }),
  useDocumentsQuota: () => ({ data: undefined }),
  useUploadAttachment: empty,
  useRenameAttachment: empty,
  useDeleteAttachment: empty,
}))
vi.mock('@/features/project-members/hooks', () => ({ useProjectMembers: () => ({ data: [] }) }))
vi.mock('@/features/tasks/comments', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/features/tasks/comments')
  return {
    ...actual,
    useTaskComments: () => ({ data: [{ id: 'c1', task_id: 't', user_id: 'x', author_name: 'Budi', body: 'Sudah dicek', is_edited: false, edited_at: null, created_at: '2026-10-14T03:00:00Z', can_edit: true, can_delete: true }], isLoading: false }),
    useEditComment: empty,
    useDeleteComment: empty,
  }
})

const caps = (over: Partial<Capabilities>): Capabilities => ({
  create_task: false,
  edit_own_task: false,
  comment: false,
  log_time: false,
  attach: false,
  manage_project: false,
  manage_rules: false,
  manage_members: false,
  approve_task: false,
  ...over,
})
const EDITOR = caps({ create_task: true, edit_own_task: true, comment: true, log_time: true, attach: true })
const PM = caps({ create_task: true, edit_own_task: true, comment: true, log_time: true, attach: true, manage_project: true })

const status: CustomStatus = { id: 's1', name: 'IN PROGRESS', color_token: 'signal', position: 1, is_system: true, is_undefined: false, require_start_confirmation: false, require_pic: true, task_count: 0 }
const reviewStatus: CustomStatus = { ...status, id: 's2', name: 'UNDER REVIEW', color_token: 'violet', position: 2, require_start_confirmation: true }
const task = (assignee: string): Task =>
  ({
    id: 't',
    project_id: 'p',
    sprint_id: null,
    sprint_name: null,
    parent_task_id: null,
    status_id: 's1',
    status_name: 'IN PROGRESS',
    status_color: null,
    title: 'Uji modal',
    description: 'Deskripsi',
    priority: 'medium',
    completeness: null,
    start_date: null,
    due_date: null,
    estimated_hours: null,
    story_points: null,
    task_code: 'QST-001',
    created_by: 'x',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '',
    completed_at: null,
    is_blocked: false,
    regression_count: 0,
    position: 1,
    assignees: [{ user_id: assignee, display_name: 'A', email: 'a@x.id', role: 'lead' }],
    active_pics: [],
  }) as Task

function open(capabilities: Capabilities | undefined, assignee: string, allowEditorStoryPoints = false, over: Partial<Task> = {}) {
  state.task = { ...task(assignee), ...over }
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <TaskDetailModal taskId="t" onClose={vi.fn()} projectId="p" workspaceId="w" statuses={[status, reviewStatus]} capabilities={capabilities} allowEditorStoryPoints={allowEditorStoryPoints} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  state.sessions = []
  decide.fn = vi.fn().mockResolvedValue(undefined)
  useAuthStore.setState({ user: { id: 'me', email: 'e@x.id', display_name: 'Eka', platform_role: 'none', avatar_url: null } })
})

describe('TaskDetailModal hak akses', () => {
  it('Editor pada task miliknya: bisa edit, sub-task, komentar; tidak ada tombol Hapus task', () => {
    open(EDITOR, 'me')
    expect(screen.getByText('✎ Edit Field')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Tambah sub-task baru')).toBeInTheDocument()
    // sub-task + komentar (izin komentar dari server)
    expect(screen.getAllByText('✎ Ubah')).toHaveLength(2)
    expect(screen.getByText('+ Komentar')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
    expect(screen.queryByText(/bukan milik Anda/)).not.toBeInTheDocument()
  })

  it('Editor pada task orang lain: baca saja, alasan di footer, komentar tetap ada', () => {
    open(EDITOR, 'lain')
    expect(screen.queryByText('✎ Edit Field')).not.toBeInTheDocument()
    expect(screen.getByText('🔒 Baca saja')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Tambah sub-task baru')).not.toBeInTheDocument()
    // tersisa hanya tombol ubah komentar (izin dari server), bukan sub-task
    expect(screen.getAllByText('✎ Ubah')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'IN PROGRESS' })).toBeDisabled()
    expect(screen.getByText(/Task ini bukan milik Anda/)).toBeInTheDocument()
    expect(screen.getByText('+ Komentar')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
  })

  it('story point Editor terkunci kecuali project mengizinkan (S6E-08)', () => {
    const { unmount } = open(EDITOR, 'me')
    fireEvent.click(screen.getByText('✎ Edit Field'))
    expect(screen.getByText(/Story point diisi Project Manager/)).toBeInTheDocument()
    expect(screen.queryByText('STORY POINT · SKALA FIBONACCI')).not.toBeInTheDocument()
    unmount()
    open(EDITOR, 'me', true)
    fireEvent.click(screen.getByText('✎ Edit Field'))
    expect(screen.getByText('STORY POINT · SKALA FIBONACCI')).toBeInTheDocument()
  })

  it('role tanpa izin komentar tidak melihat tombol Komentar', () => {
    open(caps({}), 'lain')
    expect(screen.queryByText('+ Komentar')).not.toBeInTheDocument()
    expect(screen.getByText(/tidak dapat berkomentar/)).toBeInTheDocument()
  })

  // S7A-05 (IG-151): Approver baca saja untuk konten task, tetapi boleh melampirkan dan berkomentar.
  const APPROVER = caps({ comment: true, attach: true, approve_task: true })

  it('Approver: konten terkunci, alasan khusus Approver, komentar ada, pindah status/hapus tidak ada', () => {
    open(APPROVER, 'lain')
    expect(screen.queryByText('✎ Edit Field')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Tambah sub-task baru')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'IN PROGRESS' })).toBeDisabled()
    expect(screen.getByText(/Sebagai Approver Anda dapat mengubah status task, melampirkan berkas, dan berkomentar — namun tidak mengubah judul, deskripsi, atau assignee\./)).toBeInTheDocument()
    expect(screen.getByText(/Status task diubah lewat keputusan Setujui\/Tolak/)).toBeInTheDocument()
    expect(screen.getByText('+ Komentar')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
  })

  it('Approver: tab LAMPIRAN dapat mengunggah; Viewer tidak', () => {
    const { unmount } = open(APPROVER, 'lain')
    fireEvent.click(screen.getByText('LAMPIRAN'))
    expect(screen.getByText(/pilih file/)).toBeInTheDocument()
    expect(screen.queryByText(/Anda tidak dapat mengunggah lampiran/)).not.toBeInTheDocument()
    unmount()
    open(caps({}), 'lain')
    fireEvent.click(screen.getByText('LAMPIRAN'))
    expect(screen.getByText(/Anda tidak dapat mengunggah lampiran/)).toBeInTheDocument()
  })

  it('PM: akses penuh termasuk Hapus task', () => {
    open(PM, 'lain')
    expect(screen.getByText('✎ Edit Field')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeInTheDocument()
  })

  it('komentar tampil dengan aksi ubah/hapus sesuai izin server', () => {
    open(EDITOR, 'me')
    expect(screen.getByText('Sudah dicek')).toBeInTheDocument()
    expect(screen.getByText('✕ Hapus')).toBeInTheDocument()
  })
})

// S7A-09 (IG-155): keputusan approval dari Task Detail mode Approver.
describe('TaskDetailModal mode Approver: keputusan approval', () => {
  const APPROVER = caps({ comment: true, attach: true, approve_task: true })
  const review: Partial<Task> = { status_id: 's2', status_name: 'UNDER REVIEW', task_code: 'QST-004', title: 'Review desain profil' }
  const pic = { id: 'p1', task_id: 't', status_id: 's2', status_name: 'UNDER REVIEW', user_id: 'x', user_name: 'Citra', user_email: 'c@x.id', is_active: true, acknowledged_at: null, activated_at: '2026-10-05T00:00:00Z', deactivated_at: null, assigned_by: null }

  it('task UNDER REVIEW menampilkan KEPUTUSAN APPROVAL; status lain, PM, dan Editor tidak', () => {
    const { unmount } = open(APPROVER, 'lain', false, review)
    expect(screen.getByText('KEPUTUSAN APPROVAL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✓ SETUJUI' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✕ TOLAK' })).toBeInTheDocument()
    unmount()
    open(APPROVER, 'lain')
    expect(screen.queryByText('KEPUTUSAN APPROVAL')).not.toBeInTheDocument()
    unmount()
    open(PM, 'lain', false, review)
    expect(screen.queryByText('KEPUTUSAN APPROVAL')).not.toBeInTheDocument()
    unmount()
    open(EDITOR, 'me', false, review)
    expect(screen.queryByText('KEPUTUSAN APPROVAL')).not.toBeInTheDocument()
  })

  it('setuju: modal konfirmasi, catatan opsional, keputusan terkirim lalu notifikasi tampil', async () => {
    open(APPROVER, 'lain', false, { ...review, active_pics: [pic] as unknown as Task['active_pics'] })
    fireEvent.click(screen.getByRole('button', { name: '✓ SETUJUI' }))
    expect(screen.getByText('Setujui QST-004 — Review desain profil')).toBeInTheDocument()
    expect(screen.getByText('Status saat ini UNDER REVIEW · PIC Citra')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '✓ SETUJUI TASK' }))
    await waitFor(() => expect(decide.fn).toHaveBeenCalledWith({ taskId: 't', decision: 'approve', note: '' }))
    expect(await screen.findByText(/Task QST-004 disetujui dan dipindahkan ke DONE/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: /Setujui QST-004/ })).not.toBeInTheDocument()
  })

  it('tolak tanpa alasan ditolak dengan pesan desain; dengan alasan terkirim', async () => {
    open(APPROVER, 'lain', false, review)
    fireEvent.click(screen.getByRole('button', { name: '✕ TOLAK' }))
    fireEvent.click(screen.getByRole('button', { name: '✕ TOLAK TASK' }))
    expect(screen.getByText(/Alasan penolakan minimal 5 karakter agar assignee tahu apa yang perlu diperbaiki/)).toBeInTheDocument()
    expect(decide.fn).not.toHaveBeenCalled()
    fireEvent.change(screen.getByPlaceholderText(/Jelaskan bagian yang perlu diperbaiki/), { target: { value: 'Uji ulang pembayaran' } })
    fireEvent.click(screen.getByRole('button', { name: '✕ TOLAK TASK' }))
    await waitFor(() => expect(decide.fn).toHaveBeenCalledWith({ taskId: 't', decision: 'reject', note: 'Uji ulang pembayaran' }))
    expect(await screen.findByText(/Task QST-004 ditolak dan dikembalikan ke IN PROGRESS/)).toBeInTheDocument()
  })

  it('galat server (sudah diputuskan) tampil di modal dan modal tetap terbuka', async () => {
    decide.fn = vi.fn().mockRejectedValue(new ApiError('NOT_IN_REVIEW', 'x', 409))
    open(APPROVER, 'lain', false, review)
    fireEvent.click(screen.getByRole('button', { name: '✓ SETUJUI' }))
    fireEvent.click(screen.getByRole('button', { name: '✓ SETUJUI TASK' }))
    expect(await screen.findByText(/sudah tidak berstatus UNDER REVIEW/)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /Setujui QST-004/ })).toBeInTheDocument()
  })

  it('Mulai Pengerjaan hanya bila Approver adalah PIC aktif fase itu', () => {
    state.sessions = [{ id: 's', task_id: 't', status_id: 's2', status_name: 'UNDER REVIEW', session_no: 1, entered_at: '2026-10-05T00:00:00Z', exited_at: null, work_started_at: null, is_regression: false, is_auto_start: false, triggered_by: null }]
    const { unmount } = open(APPROVER, 'lain', false, review)
    expect(screen.queryByText(/Mulai Pengerjaan/)).not.toBeInTheDocument()
    unmount()
    open(APPROVER, 'lain', false, { ...review, active_pics: [{ ...pic, user_id: 'me' }] as unknown as Task['active_pics'] })
    expect(screen.getByText(/Mulai Pengerjaan/)).toBeInTheDocument()
  })

  it('tab WAKTU STATUS: Approver tidak mencatat waktu; PM tetap bisa', () => {
    const { unmount } = open(APPROVER, 'lain', false, review)
    fireEvent.click(screen.getByText('WAKTU STATUS'))
    expect(screen.getByText(/Approver tidak mencatat waktu kerja/)).toBeInTheDocument()
    expect(screen.queryByText(/Mulai Timer/)).not.toBeInTheDocument()
    unmount()
    open(PM, 'lain', false, review)
    fireEvent.click(screen.getByText('WAKTU STATUS'))
    expect(screen.getByText(/Mulai Timer/)).toBeInTheDocument()
  })
})
