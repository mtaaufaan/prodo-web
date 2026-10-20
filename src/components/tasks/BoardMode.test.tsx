import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomStatus, Task } from '@/features/tasks/types'
import { useAuthStore } from '@/store/useAuthStore'

import { FULL_BOARD_MODE, type BoardMode } from './boardMode'
import KanbanBoard from './KanbanBoard'
import TaskListView from './TaskListView'

vi.mock('@/features/project-members/hooks', () => ({ useProjectMembers: () => ({ data: [] }) }))

const EDITOR: BoardMode = { limitToMine: true, readOnly: false, bulk: false }

const status = (id: string, name: string, position: number): CustomStatus => ({
  id,
  name,
  color_token: 'signal',
  position,
  is_system: true,
  is_undefined: false,
  require_start_confirmation: false,
  require_pic: true,
  task_count: 0,
})
const statuses = [status('s1', 'BACKLOG', 0), status('s2', 'IN PROGRESS', 1), status('s3', 'DONE', 2)]

const base: Task = {
  id: 't',
  project_id: 'p',
  sprint_id: 'sp',
  sprint_name: 'Sprint 1',
  parent_task_id: null,
  status_id: 's2',
  status_name: 'IN PROGRESS',
  status_color: 'signal',
  title: 'T',
  description: null,
  priority: 'medium',
  completeness: null,
  start_date: null,
  due_date: '2099-01-01',
  estimated_hours: 8,
  story_points: 3,
  task_code: 'QST-000',
  created_by: 'x',
  created_at: '',
  updated_at: '',
  completed_at: null,
  is_blocked: false,
  regression_count: 0,
  position: 1,
  assignees: [],
  active_pics: [],
}
const owned = (userId: string, name: string) => ({ user_id: userId, display_name: name, email: `${name}@x.id`, role: 'lead' as const })
const picOf = (userId: string) =>
  ({ id: 'p1', task_id: 't', status_id: 's1', status_name: 'BACKLOG', user_id: userId, user_name: 'Me', user_email: 'm@x.id', is_active: true, acknowledged_at: null, activated_at: '', deactivated_at: null, assigned_by: null }) as Task['active_pics'][number]

const mine = { ...base, id: 'mine', task_code: 'QST-001', title: 'Task milik saya', assignees: [owned('me', 'Eka')] }
const theirs = { ...base, id: 'theirs', task_code: 'QST-002', title: 'Task orang lain', assignees: [owned('lain', 'Budi')] }
const backlogMine: Task = { ...base, id: 'bk', task_code: 'QST-003', title: 'Backlog saya', status_id: 's1', status_name: 'BACKLOG', completeness: 'incomplete', assignees: [owned('me', 'Eka')], active_pics: [picOf('me')] }

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  useAuthStore.setState({ user: { id: 'me', email: 'e@x.id', display_name: 'Eka', platform_role: 'none', avatar_url: null } })
})

describe('KanbanBoard mode Editor', () => {
  const card = (title: string) => screen.getByText(title).closest('[draggable]') as HTMLElement

  it('hanya task milik yang bisa di-drag; task lain terkunci dengan penanda dan tooltip', () => {
    wrap(<KanbanBoard projectId="p" statuses={statuses} tasks={[mine, theirs]} onOpenTask={vi.fn()} activeSprintId="sp" mode={EDITOR} />)
    expect(card('Task milik saya')).toHaveAttribute('draggable', 'true')
    expect(card('Task orang lain')).toHaveAttribute('draggable', 'false')
    expect(within(card('Task orang lain')).getByTitle(/bukan milik Anda/)).toBeInTheDocument()
    expect(within(card('Task milik saya')).getByText('MILIK SAYA')).toBeInTheDocument()
  })

  it('quick-move hanya pada task milik; checkbox dan bar bulk tidak ada', () => {
    wrap(<KanbanBoard projectId="p" statuses={statuses} tasks={[mine, theirs]} onOpenTask={vi.fn()} activeSprintId="sp" mode={EDITOR} />)
    expect(within(card('Task milik saya')).getByRole('button', { name: /DONE →/ })).toBeInTheDocument()
    expect(within(card('Task orang lain')).queryByRole('button', { name: /→|←/ })).not.toBeInTheDocument()
    expect(screen.queryByText('☐')).not.toBeInTheDocument()
  })

  it('menampilkan chip TASK SAYA (n) dan catatan hak Editor', () => {
    wrap(<KanbanBoard projectId="p" statuses={statuses} tasks={[mine, theirs]} onOpenTask={vi.fn()} activeSprintId="sp" mode={EDITOR} />)
    expect(screen.getByRole('button', { name: /TASK SAYA \(1\)/ })).toBeInTheDocument()
    expect(screen.getByText(/Anda dapat mengubah 1 task yang ditugaskan kepada Anda/)).toBeInTheDocument()
  })

  it('tanpa task milik: catatan meminta PM menugaskan', () => {
    wrap(<KanbanBoard projectId="p" statuses={statuses} tasks={[theirs]} onOpenTask={vi.fn()} activeSprintId="sp" mode={EDITOR} />)
    expect(screen.getByText(/Belum ada task yang ditugaskan kepada Anda/)).toBeInTheDocument()
  })

  it('tombol tandai lengkap hanya untuk PIC aktif task BACKLOG', () => {
    wrap(<KanbanBoard projectId="p" statuses={statuses} tasks={[backlogMine, mine]} onOpenTask={vi.fn()} activeSprintId="sp" mode={EDITOR} />)
    expect(within(card('Backlog saya')).getByRole('button', { name: '✓ TANDAI LENGKAP' })).toBeInTheDocument()
    expect(within(card('Task milik saya')).queryByRole('button', { name: /TANDAI/ })).not.toBeInTheDocument()
  })

  it('mode baca saja: tidak ada drag, tombol pindah, maupun petunjuk seret', () => {
    wrap(<KanbanBoard projectId="p" statuses={statuses} tasks={[mine]} onOpenTask={vi.fn()} activeSprintId="sp" mode={{ limitToMine: false, readOnly: true, bulk: false }} />)
    expect(card('Task milik saya')).toHaveAttribute('draggable', 'false')
    expect(screen.queryByText(/Seret kartu/)).not.toBeInTheDocument()
  })
})

// S7A-05 (IG-151): mode Approver = baca-saja -- semua task terlihat, kartu terkunci, tanpa aksi ubah.
describe('Board mode Approver (baca saja)', () => {
  const APPROVER: BoardMode = { limitToMine: false, readOnly: true, bulk: false }
  const card = (title: string) => screen.getByText(title).closest('[draggable]') as HTMLElement

  it('Kanban: semua task terlihat dan terkunci -- tanpa drag, quick-move, checkbox, tombol tandai lengkap, petunjuk seret', () => {
    wrap(<KanbanBoard projectId="p" statuses={statuses} tasks={[mine, theirs, backlogMine]} onOpenTask={vi.fn()} activeSprintId="sp" mode={APPROVER} />)
    for (const title of ['Task milik saya', 'Task orang lain', 'Backlog saya']) {
      expect(card(title)).toHaveAttribute('draggable', 'false')
      expect(within(card(title)).getByTitle(/role Anda tidak dapat mengubah task/)).toBeInTheDocument()
      expect(within(card(title)).queryByRole('button', { name: /→|←|TANDAI/ })).not.toBeInTheDocument()
    }
    expect(screen.queryByText('☐')).not.toBeInTheDocument()
    expect(screen.queryByText(/Seret kartu/)).not.toBeInTheDocument()
    expect(screen.queryByText(/TASK DIPILIH/)).not.toBeInTheDocument()
    expect(screen.queryByTitle(/bukan milik Anda/)).not.toBeInTheDocument() // bukan penanda mode Editor
  })

  it('Kanban: klik kartu tetap membuka detail', () => {
    const open = vi.fn()
    wrap(<KanbanBoard projectId="p" statuses={statuses} tasks={[theirs]} onOpenTask={open} activeSprintId="sp" mode={APPROVER} />)
    fireEvent.click(screen.getByText('Task orang lain'))
    expect(open).toHaveBeenCalledWith('theirs')
  })

  it('Daftar: semua task terlihat tanpa penanda MILIK SAYA/redup, baris membuka detail', () => {
    const open = vi.fn()
    wrap(<TaskListView tasks={[mine, theirs]} statuses={statuses} mode={APPROVER} onOpenTask={open} />)
    expect(screen.getByText('Task milik saya')).toBeInTheDocument()
    expect(screen.getByText('Task orang lain')).toBeInTheDocument()
    expect(screen.queryByText('MILIK SAYA')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Task orang lain'))
    expect(open).toHaveBeenCalledWith('theirs')
  })

  it('mode Editor tidak mendapat kunci mode baca-saja pada task miliknya (regresi)', () => {
    wrap(<KanbanBoard projectId="p" statuses={statuses} tasks={[mine]} onOpenTask={vi.fn()} activeSprintId="sp" mode={EDITOR} />)
    expect(within(card('Task milik saya')).queryByTitle(/role Anda tidak dapat mengubah task/)).not.toBeInTheDocument()
  })
})

describe('KanbanBoard mode PM (regresi)', () => {
  const card = (title: string) => screen.getByText(title).closest('[draggable]') as HTMLElement

  it('semua task bisa di-drag, ada checkbox bulk, chip Punya Saya, tanpa penanda kunci', () => {
    wrap(<KanbanBoard projectId="p" statuses={statuses} tasks={[mine, theirs]} onOpenTask={vi.fn()} activeSprintId="sp" mode={FULL_BOARD_MODE} />)
    expect(card('Task milik saya')).toHaveAttribute('draggable', 'true')
    expect(card('Task orang lain')).toHaveAttribute('draggable', 'true')
    expect(screen.getAllByText('☐')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Punya Saya' })).toBeInTheDocument()
    expect(screen.queryByTitle(/bukan milik Anda/)).not.toBeInTheDocument()
    expect(within(card('Task milik saya')).getByText('SAYA')).toBeInTheDocument()
  })

  it('memilih task memunculkan bar bulk', () => {
    wrap(<KanbanBoard projectId="p" statuses={statuses} tasks={[mine, theirs]} onOpenTask={vi.fn()} activeSprintId="sp" mode={FULL_BOARD_MODE} />)
    fireEvent.click(screen.getAllByText('☐')[0])
    expect(screen.getByText(/1 TASK DIPILIH/)).toBeInTheDocument()
  })
})

describe('TaskListView', () => {
  const tasks: Task[] = [
    mine,
    theirs,
    { ...base, id: 'late', task_code: 'QST-004', title: 'Task terlambat', due_date: '2020-01-01', assignees: [] },
  ]

  it('menampilkan kolom, jumlah, penanda MILIK SAYA, dan meredupkan task lain pada mode Editor', () => {
    wrap(<TaskListView tasks={tasks} statuses={statuses} mode={EDITOR} onOpenTask={vi.fn()} />)
    expect(screen.getByText('3 TASK DITAMPILKAN DARI 3')).toBeInTheDocument()
    for (const h of ['TASK', 'STATUS', 'PRIO', 'ASSIGNEE', 'DUE']) expect(screen.getByText(h)).toBeInTheDocument()
    expect(screen.getByText('MILIK SAYA')).toBeInTheDocument()
    expect(screen.getByText('Task orang lain').closest('[title]')).toHaveAttribute('title', expect.stringContaining('bukan milik Anda'))
  })

  it('mode PM: tanpa penanda MILIK SAYA dan tanpa redup', () => {
    wrap(<TaskListView tasks={tasks} statuses={statuses} mode={FULL_BOARD_MODE} onOpenTask={vi.fn()} />)
    expect(screen.queryByText('MILIK SAYA')).not.toBeInTheDocument()
    expect(screen.queryByTitle(/bukan milik Anda/)).not.toBeInTheDocument()
  })

  it('filter due Terlambat menyaring baris, RESET mengembalikan semua', () => {
    wrap(<TaskListView tasks={tasks} statuses={statuses} mode={FULL_BOARD_MODE} onOpenTask={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /FILTER/ }))
    fireEvent.change(screen.getByLabelText('DUE DATE'), { target: { value: 'Terlambat' } })
    expect(screen.getByText('1 TASK DITAMPILKAN DARI 3')).toBeInTheDocument()
    expect(screen.getByText('AKTIF')).toBeInTheDocument()
    expect(screen.getByText('Task terlambat')).toBeInTheDocument()
    expect(screen.queryByText('Task orang lain')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'RESET' }))
    expect(screen.getByText('3 TASK DITAMPILKAN DARI 3')).toBeInTheDocument()
  })

  it('filter assignee Belum ada dan klik judul membuka detail', () => {
    const onOpen = vi.fn()
    wrap(<TaskListView tasks={tasks} statuses={statuses} mode={FULL_BOARD_MODE} onOpenTask={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: /FILTER/ }))
    fireEvent.change(screen.getByLabelText('ASSIGNEE'), { target: { value: 'Belum ada' } })
    expect(screen.getByText('1 TASK DITAMPILKAN DARI 3')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Task terlambat'))
    expect(onOpen).toHaveBeenCalledWith('late')
  })

  it('daftar kosong menampilkan petunjuk + TASK', () => {
    wrap(<TaskListView tasks={[]} statuses={statuses} mode={FULL_BOARD_MODE} onOpenTask={vi.fn()} />)
    expect(screen.getByText(/Tidak ada task pada project ini/)).toBeInTheDocument()
  })
})
