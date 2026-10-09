import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Sprint, Task } from '@/features/tasks/types'

import GanttChart from './GanttChart'

vi.mock('@/features/tasks/hooks', () => ({
  useProjectStatusSessions: () => ({ data: [], isLoading: false }),
  useProjectDependencies: () => ({ data: [], isLoading: false }),
  useUpdateTask: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
}))

const sprint = (id: string, name: string, start: string, end: string) => ({ id, name, start_date: start, end_date: end }) as Sprint
const task = (id: string, sprintId: string, sprintName: string, start: string, due: string) =>
  ({
    id,
    task_code: id.toUpperCase(),
    title: `Task ${id}`,
    sprint_id: sprintId,
    sprint_name: sprintName,
    start_date: start,
    due_date: due,
    status_name: 'BACKLOG',
    priority: 'medium',
    estimated_hours: null,
    logged_minutes: 0,
    is_blocked: false,
  }) as unknown as Task

// Sprint 1 sengaja muncul lebih dulu di daftar task (kasus screenshot).
const sprints = [sprint('s1', 'Sprint 1 - Article List', '2026-10-05', '2026-10-16'), sprint('s0', 'Sprint 0 - Fondation', '2026-09-28', '2026-10-05')]
const tasks = [task('a', 's1', 'Sprint 1 - Article List', '2026-10-06', '2026-10-09'), task('b', 's0', 'Sprint 0 - Fondation', '2026-09-29', '2026-10-02')]

describe('GanttChart filter sprint', () => {
  const scrollTo = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'))
    scrollTo.mockClear()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { value: scrollTo, configurable: true, writable: true })
  })
  afterEach(() => vi.useRealTimers())

  const renderGantt = () => render(<GanttChart projectId="p1" tasks={tasks} sprints={sprints} onOpenTask={vi.fn()} />)
  const chipLabels = () => screen.getAllByRole('button').map((b) => b.textContent).filter((t) => t?.startsWith('SEMUA SPRINT') || t?.startsWith('SPRINT'))

  it('tombol sprint urut menurut timeline sprint, bukan urutan task', () => {
    renderGantt()
    expect(chipLabels()).toEqual(['SEMUA SPRINT', 'SPRINT 0 - FONDATION', 'SPRINT 1 - ARTICLE LIST'])
  })

  it('default "Semua" memfokuskan garis Hari Ini; pilih sprint -> tanggal mulai sprint; kembali ke Semua -> Hari Ini', () => {
    renderGantt()
    // rentang mulai 28 Sep (Sprint 0); hari ini 10 Okt = hari ke-12 -> 12*28 - 260
    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 12 * 28 - 260, behavior: 'auto' })

    fireEvent.click(screen.getByRole('button', { name: 'SPRINT 1 - ARTICLE LIST' }))
    // mulai Sprint 1 = 5 Okt = hari ke-7 -> 7*28 - 48
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 7 * 28 - 48, behavior: 'smooth' })

    fireEvent.click(screen.getByRole('button', { name: 'SPRINT 0 - FONDATION' }))
    // mulai Sprint 0 = awal rentang -> dijepit ke 0
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' })

    fireEvent.click(screen.getByRole('button', { name: 'SEMUA SPRINT' }))
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 12 * 28 - 260, behavior: 'smooth' })
  })
})
