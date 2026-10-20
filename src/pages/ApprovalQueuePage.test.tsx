import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api'

import ApprovalQueuePage from './ApprovalQueuePage'

// S7A-03: halaman Antrean Approval utuh (hook + modal + baris) di atas mock store; API dilayani approvalsStore.
const m = vi.hoisted(() => ({ canApprove: true }))

vi.mock('@/features/approvals/api', async () => {
  const store = await import('@/mocks/approvalsStore')
  return {
    listApprovals: async (projectId: string, view: 'pending' | 'decided', page: number, perPage: number) => store.listApprovals(projectId, view, page, perPage, '2026-10-20'),
    decideApproval: async (taskId: string, decision: 'approve' | 'reject', note: string) => {
      const out = store.decide(taskId, decision, note)
      if (!out.ok) throw new ApiError(out.code, out.message)
      return out.result
    },
  }
})
vi.mock('@/features/context/hooks', () => ({
  useMyContext: () => ({
    data: {
      workspace_memberships: [
        {
          workspace_id: 'ws-1', role: 'approver',
          capabilities: { create_task: false, edit_own_task: false, comment: true, log_time: false, attach: true, manage_project: false, manage_rules: false, manage_members: false, approve_task: m.canApprove },
        },
      ],
      project_scoped_projects: [],
    },
  }),
  useMyProjects: () => ({ data: [{ id: 'mock-proj-prodo', name: 'PRODO' }] }),
}))

function Frame({ view }: { view: string }) {
  return <Outlet context={{ view, registerCta: vi.fn(), query: '' }} />
}
const show = (view = 'Menunggu Saya') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/workspaces/ws-1/projects/mock-proj-prodo/approvals']}>
        <Routes>
          <Route element={<Frame view={view} />}>
            <Route path="/workspaces/:wsId/projects/:projectId/approvals" element={<ApprovalQueuePage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

describe('ApprovalQueuePage', () => {
  it('tanpa approve_task: strip abu-abu dan baris terkunci (dibuka dulu karena store belum berubah)', async () => {
    m.canApprove = false
    show()
    expect(await screen.findByText('Tinjau kontrak vendor')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '✓ SETUJUI' })).not.toBeInTheDocument()
    expect(screen.getAllByText(/Hanya baca/).length).toBe(3)
    m.canApprove = true
  })

  it('kartu, strip AKSES APPROVER, catatan kaki, dan baris antrean', async () => {
    show()
    expect(await screen.findByText('Tinjau kontrak vendor')).toBeInTheDocument()
    expect(screen.getByText('AKSES APPROVER')).toBeInTheDocument()
    expect(screen.getByText(/Approver hanya dapat menyetujui atau menolak/)).toBeInTheDocument()
    expect(screen.getByText('MENUNGGU SAYA').nextSibling).toHaveTextContent('3')
    expect(screen.getByText('TOTAL TASK').nextSibling).toHaveTextContent('4')
    expect(screen.getByText('PRODO')).toBeInTheDocument() // catatan kartu TOTAL TASK
    expect(screen.getAllByRole('button', { name: '✓ SETUJUI' })).toHaveLength(3)
  })

  it('tolak tanpa alasan -> galat; dengan alasan -> banner, hitungan turun, masuk Sudah Diputuskan', async () => {
    const view = show()
    await screen.findByText('Tinjau kontrak vendor')
    fireEvent.click(screen.getAllByRole('button', { name: '✕ TOLAK' })[0])
    fireEvent.click(screen.getByRole('button', { name: '✕ TOLAK TASK' }))
    expect(screen.getByText(/Alasan penolakan minimal 5 karakter/)).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Rincian anggaran belum lengkap.' } })
    fireEvent.click(screen.getByRole('button', { name: '✕ TOLAK TASK' }))
    expect(await screen.findByText(/PRD-101 ditolak dan dikembalikan ke IN PROGRESS\. Assignee diberi notifikasi beserta alasan\./)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('MENUNGGU SAYA').nextSibling).toHaveTextContent('2'))
    expect(screen.getByText('DIPUTUSKAN').nextSibling).toHaveTextContent('1')
    expect(screen.queryByText('Tinjau kontrak vendor')).not.toBeInTheDocument()
    view.unmount()

    show('Sudah Diputuskan')
    expect(await screen.findByText('Tinjau kontrak vendor')).toBeInTheDocument()
    expect(screen.getByText('DITOLAK')).toBeInTheDocument()
    expect(screen.getByText(/Sudah diputuskan/)).toBeInTheDocument()
  })

  it('setuju tanpa catatan berhasil dan banner dapat ditutup', async () => {
    show()
    await screen.findByText('Siapkan template laporan')
    fireEvent.click(screen.getAllByRole('button', { name: '✓ SETUJUI' })[0])
    fireEvent.click(screen.getByRole('button', { name: '✓ SETUJUI TASK' }))
    expect(await screen.findByText(/PRD-102 disetujui dan dipindahkan ke DONE\. Assignee diberi notifikasi\./)).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Tutup'))
    expect(screen.queryByText(/PRD-102 disetujui/)).not.toBeInTheDocument()
  })

  it('empty state per tab', async () => {
    show()
    await waitFor(() => expect(screen.getByText('MENUNGGU SAYA').nextSibling).toHaveTextContent('1'))
    fireEvent.click(screen.getAllByRole('button', { name: '✓ SETUJUI' })[0])
    fireEvent.click(screen.getByRole('button', { name: '✓ SETUJUI TASK' }))
    expect(await screen.findByText('Tidak ada task menunggu keputusan Anda.')).toBeInTheDocument()
  })
})
