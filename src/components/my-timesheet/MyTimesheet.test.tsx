import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MyHoursTimesheet, TimesheetTask } from '@/features/my-timesheet/types'
import MyTimesheetPage from '@/pages/MyTimesheetPage'
import { useAuthStore } from '@/store/useAuthStore'

import LogTimeModal from './LogTimeModal'

const task = (over: Partial<TimesheetTask>): TimesheetTask => ({
  task_id: 't1',
  task_code: 'QST-002',
  title: 'Implementasi daftar quest',
  project_id: 'p1',
  project_name: 'QuestLog',
  status_name: 'IN PROGRESS',
  estimate_hours: 8,
  logged_hours: 6,
  week_hours: 2.5,
  is_active: true,
  ...over,
})

describe('LogTimeModal', () => {
  const setup = (tasks: TimesheetTask[] = [task({}), task({ task_id: 't2', task_code: 'PRD-014', title: 'Rapikan pengaturan', project_name: 'PRODO' })], onSubmit = vi.fn().mockResolvedValue('')) => {
    const onClose = vi.fn()
    render(<LogTimeModal userName="Eka Editor" tasks={tasks} onSubmit={onSubmit} onClose={onClose} />)
    return { onSubmit, onClose, hours: screen.getByLabelText('JAM'), note: screen.getByLabelText(/CATATAN/) }
  }
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'CATAT WAKTU' }))

  it('menampilkan nama pencatat dan teks aturan persis desain', () => {
    setup()
    expect(screen.getByText('Pencatatan atas nama Eka Editor · masuk ke timesheet minggu ini')).toBeInTheDocument()
    expect(screen.getByText(/Maksimal 12 jam per entri\. Jam yang sudah dicatat tidak dapat dihapus sendiri/)).toBeInTheDocument()
  })

  it('tanpa memilih task: pesan pilih task, tidak terkirim', () => {
    const { onSubmit } = setup()
    submit()
    expect(screen.getByText(/Pilih task yang dikerjakan terlebih dahulu/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('jam kosong atau 0 ditolak', () => {
    const { onSubmit, hours } = setup()
    fireEvent.click(screen.getByRole('option', { name: /QST-002/ }))
    submit()
    expect(screen.getByText('⚠ Jumlah jam harus lebih dari 0.')).toBeInTheDocument()
    fireEvent.change(hours, { target: { value: '0' } })
    submit()
    expect(screen.getByText('⚠ Jumlah jam harus lebih dari 0.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('13 jam ditolak dengan pesan maksimal 12 jam', () => {
    const { onSubmit, hours } = setup()
    fireEvent.click(screen.getByRole('option', { name: /QST-002/ }))
    fireEvent.change(hours, { target: { value: '13' } })
    submit()
    expect(screen.getByText(/Maksimal 12 jam per pencatatan/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('input jam menyaring huruf dan pesan galat hilang saat mengetik', () => {
    const { hours } = setup()
    submit()
    expect(screen.getByText(/Pilih task/)).toBeInTheDocument()
    fireEvent.change(hours, { target: { value: 'a2,5b' } })
    expect(hours).toHaveValue('25')
    expect(screen.queryByText(/Pilih task/)).not.toBeInTheDocument()
  })

  it('mengirim task, jam, dan catatan yang sudah di-trim', async () => {
    const { onSubmit, hours, note } = setup()
    fireEvent.click(screen.getByRole('option', { name: /PRD-014/ }))
    fireEvent.change(hours, { target: { value: '2.5' } })
    fireEvent.change(note, { target: { value: '  uji ulang  ' } })
    submit()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('t2', 2.5, 'uji ulang'))
  })

  it('galat server tampil dan modal tetap terbuka', async () => {
    const { hours } = setup(undefined, vi.fn().mockResolvedValue('Anda hanya dapat mencatat waktu pada task yang ditugaskan kepada Anda.'))
    fireEvent.click(screen.getByRole('option', { name: /QST-002/ }))
    fireEvent.change(hours, { target: { value: '1' } })
    submit()
    expect(await screen.findByText(/hanya dapat mencatat waktu/)).toBeInTheDocument()
  })

  it('tanpa task aktif menampilkan pesan kosong', () => {
    setup([])
    expect(screen.getByText('Tidak ada task aktif yang ditugaskan kepada Anda.')).toBeInTheDocument()
  })

  it('BATAL menutup modal', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'BATAL' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

// --- Halaman ---

const h = vi.hoisted(() => ({
  view: 'Minggu Ini',
  caps: { log_time: true, manage_project: false, comment: true } as Record<string, boolean> | undefined,
  role: 'editor' as string | undefined,
  data: undefined as unknown,
  mutateAsync: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom')
  return { ...actual, useParams: () => ({ wsId: 'ws1' }), useOutletContext: () => ({ view: h.view }) }
})
vi.mock('@/features/context/hooks', () => ({ useWorkspaceCapabilities: () => ({ role: h.role, capabilities: h.caps, isLoading: false }) }))
vi.mock('@/features/my-timesheet/hooks', () => ({
  useMyHours: () => ({ data: h.data, isLoading: false, isError: false, isSuccess: true }),
  useLogTime: () => ({ mutateAsync: h.mutateAsync }),
}))

const sample: MyHoursTimesheet = {
  stats: { logged_hours: 21.5, estimate_hours: 34, over_count: 1, active_count: 3 },
  tasks: [
    task({ task_id: 't1', task_code: 'QST-002', title: 'Implementasi daftar quest', week_hours: 2.5, logged_hours: 6, estimate_hours: 8 }),
    task({ task_id: 't3', task_code: 'QST-003', title: 'Perbaiki bug sinkronisasi', week_hours: 4, logged_hours: 11, estimate_hours: 8 }),
    task({ task_id: 't5', task_code: 'QST-005', title: 'Rilis build internal', status_name: 'DONE', is_active: false, week_hours: 0, logged_hours: 5 }),
  ],
  items: [{ id: 'e1', task_id: 't1', task_code: 'QST-002', task_title: 'Implementasi daftar quest', project_name: 'QuestLog', entry_date: '2026-10-14', hours: 2.5, note: 'Layout kartu' }],
  total: 1,
}

describe('MyTimesheetPage', () => {
  beforeEach(() => {
    h.view = 'Minggu Ini'
    h.caps = { log_time: true, manage_project: false, comment: true }
    h.role = 'editor'
    h.data = sample
    h.mutateAsync.mockReset()
    useAuthStore.setState({ user: { id: 'me', email: 'e@x.id', display_name: 'Eka Editor', platform_role: 'none', avatar_url: null } })
  })

  it('strip Editor, 4 kartu dari server, kotak ajakan dengan tombol catat', () => {
    render(<MyTimesheetPage />)
    expect(screen.getByText('AKSES EDITOR')).toBeInTheDocument()
    expect(screen.getByText('21.5')).toBeInTheDocument()
    expect(screen.getByText('34.0')).toBeInTheDocument()
    expect(screen.getByText('MELEBIHI ESTIMASI')).toBeInTheDocument()
    expect(screen.getByText('DAPAT DICATAT')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ CATAT WAKTU' })).toBeInTheDocument()
  })

  it('panel minggu ini: bar terbanyak dulu, merah bila total melebihi estimasi, task tanpa jam minggu ini tidak muncul', () => {
    render(<MyTimesheetPage />)
    expect(screen.getByText('JAM SAYA MINGGU INI')).toBeInTheDocument()
    const bars = screen.getAllByRole('img')
    expect(bars).toHaveLength(2)
    expect(bars[0]).toHaveAccessibleName(/4\.0 jam minggu ini, melebihi estimasi/)
    expect(bars[1]).toHaveAccessibleName(/2\.5 jam minggu ini$/)
    expect(screen.queryByText('Rilis build internal')).not.toBeInTheDocument()
    expect(screen.getByText(/ESTIMASI 8 JAM · TOTAL 11\.0 J · IN PROGRESS · QUESTLOG/)).toBeInTheDocument()
  })

  it('viewer: strip viewer tanpa tombol catat', () => {
    h.caps = { log_time: false, manage_project: false, comment: false }
    h.role = 'viewer'
    render(<MyTimesheetPage />)
    expect(screen.getByText('AKSES VIEWER · HANYA BACA')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ CATAT WAKTU' })).not.toBeInTheDocument()
  })

  it('modal hanya menawarkan task aktif; sukses menutup modal dan menampilkan notifikasi', async () => {
    h.mutateAsync.mockResolvedValue({ entry_id: 'x', task_code: 'QST-002', hours: 2.5, task_total_hours: 8.5 })
    render(<MyTimesheetPage />)
    fireEvent.click(screen.getByRole('button', { name: '+ CATAT WAKTU' }))
    const list = screen.getByRole('listbox')
    expect(within(list).getAllByRole('option')).toHaveLength(2)
    expect(within(list).queryByText('Rilis build internal')).not.toBeInTheDocument()
    fireEvent.click(within(list).getByRole('option', { name: /QST-002/ }))
    fireEvent.change(screen.getByLabelText('JAM'), { target: { value: '2.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'CATAT WAKTU' }))
    expect(await screen.findByText(/2\.5 jam dicatat pada QST-002\. Total menjadi 8\.5 jam\. Tercatat di Audit Trail\./)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(h.mutateAsync).toHaveBeenCalledWith({ taskId: 't1', hours: 2.5, note: '' })
  })

  it('galat 403 dari server tampil di modal', async () => {
    h.mutateAsync.mockRejectedValue({ code: 'NOT_YOUR_TASK' })
    render(<MyTimesheetPage />)
    fireEvent.click(screen.getByRole('button', { name: '+ CATAT WAKTU' }))
    fireEvent.click(screen.getByRole('option', { name: /QST-002/ }))
    fireEvent.change(screen.getByLabelText('JAM'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'CATAT WAKTU' }))
    expect(await screen.findByText(/hanya dapat mencatat waktu pada task yang ditugaskan/)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('tab Riwayat: daftar per minggu dengan total jam dan catatan', () => {
    h.view = 'Riwayat'
    render(<MyTimesheetPage />)
    expect(screen.getByText('RIWAYAT JAM SAYA')).toBeInTheDocument()
    expect(screen.getByText('MINGGU 12 OKT – 18 OKT 2026')).toBeInTheDocument()
    expect(screen.getByText('14/10/2026')).toBeInTheDocument()
    expect(screen.getByText(/QUESTLOG · Layout kartu/)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('Riwayat menandai entri estimasi import dengan badge ESTIMASI', () => {
    h.view = 'Riwayat'
    h.data = { ...sample, items: [{ ...sample.items[0], id: 'e2', is_estimate: true }, sample.items[0]], total: 2 }
    render(<MyTimesheetPage />)
    // kartu ringkasan juga berlabel "ESTIMASI", jadi cari lewat title badge
    expect(screen.getAllByTitle(/Estimasi dari riwayat tanggal status/)).toHaveLength(1)
  })

  it('batas 24 jam per hari dari server tampil di modal', async () => {
    h.mutateAsync.mockRejectedValue({ code: 'DAILY_LIMIT' })
    render(<MyTimesheetPage />)
    fireEvent.click(screen.getByRole('button', { name: '+ CATAT WAKTU' }))
    fireEvent.click(screen.getByRole('option', { name: /QST-002/ }))
    fireEvent.change(screen.getByLabelText('JAM'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'CATAT WAKTU' }))
    expect(await screen.findByText(/tidak boleh melebihi 24 jam/)).toBeInTheDocument()
  })

  it('tab Riwayat kosong menampilkan pesan', () => {
    h.view = 'Riwayat'
    h.data = { ...sample, items: [], total: 0 }
    render(<MyTimesheetPage />)
    expect(screen.getByText('Belum ada riwayat jam tercatat.')).toBeInTheDocument()
  })

  it('minggu ini tanpa jam: pesan kosong', () => {
    h.data = { ...sample, tasks: sample.tasks.map((t) => ({ ...t, week_hours: 0 })) }
    render(<MyTimesheetPage />)
    expect(screen.getByText('Belum ada jam tercatat minggu ini.')).toBeInTheDocument()
  })
})
