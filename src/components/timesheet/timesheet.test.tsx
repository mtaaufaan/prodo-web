import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { TimesheetMemberRow } from '@/features/timesheet/types'

import EntryForm from './EntryForm'
import TimesheetMembersView from './TimesheetMembersView'

const member = (i: number): TimesheetMemberRow => ({ user_id: `u${i}`, user_name: `Member ${i}`, role: 'editor', task_count: 1, hours: 2, active_count: i % 3 })

describe('TimesheetMembersView', () => {
  it('memaginasi 10 baris per halaman dan menampilkan keterangan beban', () => {
    render(<TimesheetMembersView members={Array.from({ length: 12 }, (_, i) => member(i))} />)
    expect(screen.getByText('Member 0')).toBeInTheDocument()
    expect(screen.queryByText('Member 11')).not.toBeInTheDocument()
    expect(screen.getByText(/\/ 2 · 12 data/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /brkt/i }))
    expect(screen.getByText('Member 11')).toBeInTheDocument()
    expect(screen.getByText(/bukan penilaian kinerja individu/)).toBeInTheDocument()
  })

  it('kosong -> pesan, tanpa pager', () => {
    render(<TimesheetMembersView members={[]} />)
    expect(screen.getByText(/Belum ada jam tercatat/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nomor halaman')).not.toBeInTheDocument()
  })
})

describe('EntryForm', () => {
  const tasks = [{ id: 't1', task_code: 'P-1', title: 'Login' }]

  it('menolak input tidak valid dan menampilkan galat tanpa mengirim', () => {
    const onSubmit = vi.fn()
    render(<EntryForm tasks={tasks} submitLabel="Kirim" busy={false} serverError="" onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }))
    expect(screen.getByText(/Pilih task/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('mengirim ISO saat valid; galat server ditampilkan', () => {
    const onSubmit = vi.fn()
    const { rerender } = render(<EntryForm tasks={tasks} submitLabel="Kirim" busy={false} serverError="" onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 't1' } })
    const inputs = document.querySelectorAll('input[type="datetime-local"]')
    fireEvent.change(inputs[0], { target: { value: '2026-10-01T08:00' } })
    fireEvent.change(inputs[1], { target: { value: '2026-10-01T09:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const arg = onSubmit.mock.calls[0][0]
    expect(arg.taskId).toBe('t1')
    expect(new Date(arg.ended_at).getTime() - new Date(arg.started_at).getTime()).toBe(90 * 60 * 1000)

    rerender(<EntryForm tasks={tasks} submitLabel="Kirim" busy={false} serverError="Rentang waktu ini overlap dengan entri yang sudah ada." onSubmit={onSubmit} onCancel={vi.fn()} />)
    expect(screen.getByText(/overlap/)).toBeInTheDocument()
  })

  it('mode ubah: tanpa pemilih task dan terisi nilai awal', () => {
    render(<EntryForm tasks={null} initial={{ startLocal: '2026-10-01T08:00', endLocal: '2026-10-01T09:00', note: 'catatan' }} submitLabel="Simpan" busy={false} serverError="" onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('catatan')).toBeInTheDocument()
  })
})
