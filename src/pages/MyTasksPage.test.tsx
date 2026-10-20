import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MyTask } from '@/features/my-tasks/types'

import MyTasksPage from './MyTasksPage'

// S7A-07: halaman Task Saya dipakai Editor dan Approver; beda hanya kemampuan (capabilities) dari /me/context.
const m = vi.hoisted(() => ({
  role: 'approver' as 'approver' | 'editor',
  list: vi.fn(),
  post: vi.fn(),
  registerCta: vi.fn(),
}))

vi.mock('@/features/my-tasks/api', () => ({ listMyTasks: m.list, postTaskComment: m.post }))
vi.mock('@/features/context/hooks', () => ({
  useMyContext: () => ({
    data: {
      workspace_memberships: [
        {
          workspace_id: 'ws-1',
          role: m.role,
          capabilities:
            m.role === 'approver'
              ? { create_task: false, edit_own_task: false, comment: true, log_time: false, attach: true, manage_project: false, manage_rules: false, manage_members: false, approve_task: true }
              : { create_task: true, edit_own_task: true, comment: true, log_time: true, attach: true, manage_project: false, manage_rules: false, manage_members: false, approve_task: false },
        },
      ],
      project_scoped_projects: [],
    },
  }),
}))
vi.mock('@/features/projects/hooks', () => ({ useProjects: () => ({ data: [{ id: 'p-1', name: 'PRODO' }] }) }))
vi.mock('@/features/project-members/hooks', () => ({ useProjectMembers: () => ({ data: [] }) }))
vi.mock('@/features/tasks/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/tasks/hooks')>()),
  useSetTaskStatus: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/components/tasks/AddTaskModal', () => ({ default: () => null }))
vi.mock('@/components/tasks/PicPickerModal', () => ({ default: () => null }))

const task = (over: Partial<MyTask>): MyTask => ({
  task_id: 't1', task_code: 'PRD-002', title: 'Tinjau kontrak vendor', project_id: 'p-1', status_id: 's-rev', status_name: 'UNDER REVIEW', status_color: null,
  priority: 'high', sprint_name: 'Sprint 1', due_date: '2026-10-18', pic_names: ['Adit Approver'], comment_count: 2, sub_total: 0, sub_done: 0,
  logged_hours: 2, estimate_hours: 3, is_mine: true, is_followed: true, is_late: true, next_status: { id: 's-done', name: 'DONE', require_pic: false }, ...over,
})
const page = (items: MyTask[]) => ({ items, total: items.length, page: 1, per_page: 10, stats: { total: items.length, running: 1, logged_hours: 2, late: 1 } })

const show = (view = 'Ditugaskan') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/workspaces/ws-1/projects/p-1/my-tasks']}>
        <Routes>
          <Route element={<Outlet context={{ view, registerCta: m.registerCta, query: '' }} />}>
            <Route path="/workspaces/:wsId/projects/:projectId/my-tasks" element={<MyTasksPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  m.role = 'approver'
  m.list.mockReset().mockResolvedValue(page([task({})]))
  m.post.mockReset().mockResolvedValue({ comment_count: 3, mentions: ['Budi'], notified: 1 })
  m.registerCta.mockReset()
})

describe('MyTasksPage mode Approver', () => {
  it('strip AKSES APPROVER dengan catatan desain dan 4 kartu', async () => {
    show()
    expect(await screen.findByText('Tinjau kontrak vendor')).toBeInTheDocument()
    expect(screen.getByText('AKSES APPROVER')).toHaveClass('text-violet')
    expect(screen.getByText(/Dapat menyetujui atau menolak task pada tahap review/)).toBeInTheDocument()
    for (const label of ['TASK SAYA', 'BERJALAN', 'JAM TERCATAT', 'TERLAMBAT']) expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('tanpa tombol pindah status dan tanpa CTA "+ Task"; hanya aksi KOMENTAR', async () => {
    show()
    await screen.findByText('Tinjau kontrak vendor')
    expect(screen.queryByText('DONE →')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /KOMENTAR/ })).toBeInTheDocument()
    expect(m.registerCta).not.toHaveBeenCalledWith(expect.any(Function))
  })

  it('komentar dengan mention terkirim dan notifikasi tampil', async () => {
    show()
    await screen.findByText('Tinjau kontrak vendor')
    fireEvent.click(screen.getByRole('button', { name: /KOMENTAR/ }))
    fireEvent.change(screen.getByPlaceholderText(/ketik komentar/i), { target: { value: 'siap @budi' } })
    fireEvent.click(screen.getByRole('button', { name: 'KIRIM KOMENTAR' }))
    await waitFor(() => expect(m.post).toHaveBeenCalledWith('t1', 'siap @budi'))
    expect(await screen.findByText(/Komentar terkirim pada PRD-002 · 1 mention diberi notifikasi/)).toBeInTheDocument()
  })

  it('tab Diikuti meminta view following dan menampilkan keadaan kosong', async () => {
    m.list.mockResolvedValue(page([]))
    show('Diikuti')
    expect(await screen.findByText('Anda belum mengikuti task mana pun.')).toBeInTheDocument()
    expect(m.list).toHaveBeenCalledWith('p-1', 'following', 1, 10)
  })
})

describe('MyTasksPage mode Editor (regresi)', () => {
  it('strip mint, tombol pindah status ada, CTA "+ Task" terdaftar', async () => {
    m.role = 'editor'
    show()
    expect(await screen.findByText('Tinjau kontrak vendor')).toBeInTheDocument()
    expect(screen.getByText('AKSES EDITOR')).toHaveClass('text-mint')
    expect(screen.getByText('DONE →')).toBeInTheDocument()
    expect(m.registerCta).toHaveBeenCalledWith(expect.any(Function))
  })
})
