import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Capabilities } from '@/features/context/types'
import type { CustomStatus, Task } from '@/features/tasks/types'
import { useAuthStore } from '@/store/useAuthStore'

import TaskDetailModal from './TaskDetailModal'

// Semua hook data diganti hasil kosong; hanya yang menentukan tampilan modal ini yang diisi.
const { state, empty } = vi.hoisted(() => ({
  state: { task: undefined as unknown },
  empty: () => ({ data: undefined, isLoading: false, isPending: false, isError: false, mutate: () => undefined, mutateAsync: () => Promise.resolve() }),
}))

vi.mock('@/features/tasks/hooks', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/features/tasks/hooks')
  const overrides: Record<string, unknown> = {
    useTask: () => ({ data: state.task, isLoading: false }),
    useTaskChecklistItems: () => ({ data: [{ id: 'i1', task_id: 't', title: 'Cek hasil', is_done: false, position: 1 }] }),
  }
  return new Proxy(actual, {
    get: (t, k: string) => (k in overrides ? overrides[k] : k.startsWith('use') ? empty : t[k]),
    has: () => true,
  })
})
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
  ...over,
})
const EDITOR = caps({ create_task: true, edit_own_task: true, comment: true, log_time: true, attach: true })
const PM = caps({ create_task: true, edit_own_task: true, comment: true, log_time: true, attach: true, manage_project: true })

const status: CustomStatus = { id: 's1', name: 'IN PROGRESS', color_token: 'signal', position: 1, is_system: true, is_undefined: false, require_start_confirmation: false, require_pic: true, task_count: 0 }
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

function open(capabilities: Capabilities | undefined, assignee: string) {
  state.task = task(assignee)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <TaskDetailModal taskId="t" onClose={vi.fn()} projectId="p" workspaceId="w" statuses={[status]} capabilities={capabilities} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
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

  it('role tanpa izin komentar tidak melihat tombol Komentar', () => {
    open(caps({}), 'lain')
    expect(screen.queryByText('+ Komentar')).not.toBeInTheDocument()
    expect(screen.getByText(/tidak dapat berkomentar/)).toBeInTheDocument()
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
