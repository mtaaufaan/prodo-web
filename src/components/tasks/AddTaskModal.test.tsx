import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Capabilities } from '@/features/context/types'
import { useAuthStore } from '@/store/useAuthStore'

import AddTaskModal from './AddTaskModal'

const { mutate, members } = vi.hoisted(() => ({
  mutate: vi.fn(),
  members: [
    { user_id: 'me', email: 'me@x.id', display_name: 'Eka', role: 'editor' },
    { user_id: 'lain', email: 'lain@x.id', display_name: 'Budi', role: 'editor' },
  ],
}))
vi.mock('@/features/project-members/hooks', () => ({ useProjectMembers: () => ({ data: members }) }))
vi.mock('@/features/tasks/hooks', () => ({
  useProjectSprints: () => ({ data: [] }),
  useCreateTask: () => ({ mutate, reset: vi.fn(), isPending: false, isError: false }),
}))

const caps = (over: Partial<Capabilities>): Capabilities => ({
  create_task: true,
  edit_own_task: true,
  comment: true,
  log_time: true,
  attach: true,
  manage_project: false,
  manage_rules: false,
  manage_members: false,
  ...over,
})
const show = (capabilities?: Capabilities) => render(<AddTaskModal open onClose={vi.fn()} projectId="p" projectName="QuestLog" capabilities={capabilities} />)

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn() // jsdom tidak punya scrollIntoView
  mutate.mockClear()
  useAuthStore.setState({ user: { id: 'me', email: 'e@x.id', display_name: 'Eka', platform_role: 'none', avatar_url: null } })
})

describe('AddTaskModal', () => {
  it('Editor: assignee dikunci ke diri sendiri dan story point dikunci', () => {
    show(caps({}))
    expect(screen.getByText(/Story point diisi Project Manager/)).toBeInTheDocument()
    expect(screen.queryByText('STORY POINT · OPSIONAL')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Eka/ })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Budi/ })).not.toBeInTheDocument()
  })

  it('Editor: simpan mengirim assignee dirinya dan tanpa story point', () => {
    show(caps({}))
    fireEvent.change(screen.getByPlaceholderText('Uji regresi modul login'), { target: { value: 'Task dari Editor' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Task' }))
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0]).toMatchObject({ title: 'Task dari Editor', assignee_ids: ['me'], story_points: null })
  })

  it('judul pendek ditolak dan tidak mengirim apa pun', () => {
    show(caps({}))
    fireEvent.change(screen.getByPlaceholderText('Uji regresi modul login'), { target: { value: 'ab' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Task' }))
    expect(screen.getByText(/minimal 3 karakter/)).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('PM: semua member bisa dipilih dan story point tersedia', () => {
    show(caps({ manage_project: true }))
    expect(screen.getByText('STORY POINT · OPSIONAL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Budi/ })).toBeEnabled()
    fireEvent.change(screen.getByPlaceholderText('Uji regresi modul login'), { target: { value: 'Task PM' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Task' }))
    expect(screen.getByText(/minimal satu assignee/)).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })
})
