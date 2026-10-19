import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppNotification } from '@/features/notifications/types'

import NotificationBell from './NotificationBell'

const m = vi.hoisted(() => ({
  state: {
    items: [] as unknown[],
    unread: 0,
    isError: false,
    isLoading: false,
    hasNextPage: false,
  },
  markRead: vi.fn(),
  markAll: vi.fn(),
  fetchNextPage: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('@/features/notifications/hooks', () => ({
  useNotifications: () => ({
    data: { pages: [{ items: m.state.items, total: m.state.items.length, unread_count: m.state.unread }] },
    isError: m.state.isError,
    isLoading: m.state.isLoading,
    hasNextPage: m.state.hasNextPage,
    isFetchingNextPage: false,
    fetchNextPage: m.fetchNextPage,
  }),
  useMarkNotificationRead: () => ({ mutate: m.markRead, isPending: false }),
  useMarkAllNotificationsRead: () => ({ mutate: m.markAll, isPending: false }),
}))
vi.mock('@/store/useUIStore', () => ({ useUIStore: (sel: (s: { showToast: typeof m.showToast }) => unknown) => sel({ showToast: m.showToast }) }))

const note = (id: string, over: Partial<AppNotification> = {}): AppNotification => ({
  id, type: 'task_mention', actor_name: 'Budi', title: 'Anda di-mention di QST-002', body: 'cek data', entity_type: 'task', entity_id: `task-${id}`,
  project_id: 'proj-1', task_code: 'QST-002', project_name: 'QuestLog', is_read: false, created_at: new Date().toISOString(), ...over,
})

function Where() {
  const l = useLocation()
  return <div data-testid="where">{l.pathname + l.search}</div>
}
const show = () =>
  render(
    <MemoryRouter initialEntries={['/workspaces/ws-1/board']}>
      <NotificationBell workspaceId="ws-1" />
      <Where />
    </MemoryRouter>,
  )

beforeEach(() => {
  Object.assign(m.state, { items: [note('1'), note('2', { type: 'task_comment' }), note('3', { is_read: true })], unread: 2, isError: false, isLoading: false, hasNextPage: false })
  m.markRead.mockReset()
  m.markAll.mockReset()
  m.fetchNextPage.mockReset()
  m.showToast.mockReset()
})

describe('NotificationBell', () => {
  it('badge menampilkan jumlah belum dibaca; tersembunyi bila 0 dan 99+ bila banyak', () => {
    const { unmount } = show()
    expect(screen.getByRole('button', { name: 'Notifikasi, 2 belum dibaca' })).toHaveTextContent('2')
    unmount()
    m.state.unread = 0
    const second = show()
    expect(screen.getByRole('button', { name: 'Notifikasi' })).not.toHaveTextContent(/\d/)
    second.unmount()
    m.state.unread = 150
    show()
    expect(screen.getByRole('button', { name: /belum dibaca/ })).toHaveTextContent('99+')
  })

  it('panel memuat dua grup: Belum Dibaca dan Sudah Dibaca, lengkap dengan kode task dan project', () => {
    show()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Notifikasi/ }))
    expect(screen.getByRole('dialog', { name: 'Panel notifikasi' })).toBeInTheDocument()
    expect(screen.getByText(/BELUM DIBACA · 2/)).toBeInTheDocument()
    expect(screen.getByText('SUDAH DIBACA')).toBeInTheDocument()
    expect(screen.getAllByText('QST-002 · QuestLog')).toHaveLength(3)
    expect(screen.getAllByText('Budi')).toHaveLength(3)
  })

  it('klik notifikasi belum dibaca: tandai dibaca lalu buka Task Detail di Board project', () => {
    m.markRead.mockImplementation((_id: string, opts: { onSuccess: () => void }) => opts.onSuccess())
    show()
    fireEvent.click(screen.getByRole('button', { name: /Notifikasi/ }))
    fireEvent.click(screen.getAllByText('Anda di-mention di QST-002')[0])
    expect(m.markRead).toHaveBeenCalledTimes(1)
    expect(m.markRead.mock.calls[0][0]).toBe('1')
    expect(screen.getByTestId('where')).toHaveTextContent('/workspaces/ws-1/projects/proj-1/board?task=task-1')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('klik notifikasi yang sudah dibaca langsung membuka task tanpa menandai ulang', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: /Notifikasi/ }))
    const readRow = screen.getByText('SUDAH DIBACA').nextElementSibling as HTMLElement
    fireEvent.click(readRow)
    expect(m.markRead).not.toHaveBeenCalled()
    expect(screen.getByTestId('where')).toHaveTextContent('?task=task-3')
  })

  it('gagal menandai dibaca: toast error dan tetap di halaman', () => {
    m.markRead.mockImplementation((_id: string, opts: { onError: () => void }) => opts.onError())
    show()
    fireEvent.click(screen.getByRole('button', { name: /Notifikasi/ }))
    fireEvent.click(screen.getAllByText('Anda di-mention di QST-002')[0])
    expect(m.showToast).toHaveBeenCalledWith('Gagal menandai notifikasi dibaca.')
    expect(screen.getByTestId('where')).toHaveTextContent('/workspaces/ws-1/board')
  })

  it('Tandai Semua Dibaca aktif hanya bila ada yang belum dibaca', () => {
    const { unmount } = show()
    fireEvent.click(screen.getByRole('button', { name: /Notifikasi/ }))
    fireEvent.click(screen.getByRole('button', { name: 'TANDAI SEMUA DIBACA' }))
    expect(m.markAll).toHaveBeenCalledTimes(1)
    unmount()
    m.state.unread = 0
    show()
    fireEvent.click(screen.getByRole('button', { name: /Notifikasi/ }))
    expect(screen.getByRole('button', { name: 'TANDAI SEMUA DIBACA' })).toBeDisabled()
  })

  it('daftar kosong, error, dan muat lebih banyak', () => {
    m.state.items = []
    m.state.unread = 0
    const empty = show()
    fireEvent.click(screen.getByRole('button', { name: /Notifikasi/ }))
    expect(screen.getByText('Belum ada notifikasi.')).toBeInTheDocument()
    empty.unmount()

    Object.assign(m.state, { isError: true, unread: 5 })
    const failed = show()
    expect(screen.getByRole('button', { name: /Notifikasi/ })).not.toHaveTextContent(/\d/) // badge disembunyikan saat error
    fireEvent.click(screen.getByRole('button', { name: /Notifikasi/ }))
    expect(screen.getByText(/Gagal memuat notifikasi/)).toBeInTheDocument()
    failed.unmount()

    Object.assign(m.state, { isError: false, items: [note('1')], unread: 1, hasNextPage: true })
    show()
    fireEvent.click(screen.getByRole('button', { name: /Notifikasi/ }))
    fireEvent.click(screen.getByRole('button', { name: 'MUAT LEBIH BANYAK' }))
    expect(m.fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it('panel menutup dengan Esc dan klik di luar', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: /Notifikasi/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Notifikasi/ }))
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
