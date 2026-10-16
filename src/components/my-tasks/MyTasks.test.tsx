import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MyTask } from '@/features/my-tasks/types'

import CommentModal from './CommentModal'
import MyTaskRow from './MyTaskRow'

describe('CommentModal', () => {
  const setup = (onSubmit = vi.fn().mockResolvedValue('')) => {
    const onClose = vi.fn()
    render(<CommentModal code="QST-002" taskTitle="Daftar quest" onSubmit={onSubmit} onClose={onClose} />)
    return { onSubmit, onClose, box: screen.getByPlaceholderText(/ketik komentar/i) }
  }

  it('komentar kosong ditolak dengan pesan merah dan tidak terkirim', () => {
    const { onSubmit } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'KIRIM KOMENTAR' }))
    expect(screen.getByText(/Komentar tidak boleh kosong/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('menghitung karakter dan mention, pesan galat hilang saat mengetik', () => {
    const { box } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'KIRIM KOMENTAR' }))
    fireEvent.change(box, { target: { value: 'cek @eka dan @budi' } })
    expect(screen.queryByText(/tidak boleh kosong/)).not.toBeInTheDocument()
    expect(screen.getByText('18 / 1000')).toBeInTheDocument()
    expect(screen.getByText(/2 mention/)).toBeInTheDocument()
  })

  it('input dipotong 1000 karakter', () => {
    const { box } = setup()
    fireEvent.change(box, { target: { value: 'x'.repeat(1200) } })
    expect(screen.getByText('1000 / 1000')).toBeInTheDocument()
  })

  it('mengirim teks yang sudah di-trim', async () => {
    const { onSubmit, box } = setup()
    fireEvent.change(box, { target: { value: '  siap @eka  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'KIRIM KOMENTAR' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('siap @eka'))
  })

  it('galat dari server tampil dan modal tetap terbuka', async () => {
    const { box } = setup(vi.fn().mockResolvedValue('Gagal mengirim komentar. Coba lagi.'))
    fireEvent.change(box, { target: { value: 'halo' } })
    fireEvent.click(screen.getByRole('button', { name: 'KIRIM KOMENTAR' }))
    expect(await screen.findByText(/Gagal mengirim komentar/)).toBeInTheDocument()
  })

  it('BATAL dan klik latar menutup modal', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'BATAL' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

const task: MyTask = {
  task_id: 't1',
  task_code: 'QST-002',
  title: 'Implementasi daftar quest',
  project_id: 'p1',
  status_id: 's2',
  status_name: 'IN PROGRESS',
  status_color: 'signal',
  priority: 'high',
  sprint_name: 'Sprint 1',
  due_date: '2026-10-16',
  pic_names: ['Eka'],
  comment_count: 2,
  sub_total: 5,
  sub_done: 2,
  logged_hours: 9,
  estimate_hours: 8,
  is_mine: true,
  is_followed: true,
  is_late: false,
  next_status: { id: 's3', name: 'UNDER REVIEW', require_pic: true },
}

describe('MyTaskRow', () => {
  it('menampilkan aksi status berikutnya dan komentar, memanggil handler', () => {
    const onMove = vi.fn()
    const onComment = vi.fn()
    render(<MyTaskRow task={task} canMove canComment onMove={onMove} onComment={onComment} />)
    expect(screen.getByText('SPRINT 1 · DUE 16/10/2026 · PIC Eka · 2 KOMENTAR')).toBeInTheDocument()
    expect(screen.getByText('2/5 SUB-TASK SELESAI')).toBeInTheDocument()
    expect(screen.getByText('9J / 8J')).toHaveClass('text-red')
    fireEvent.click(screen.getByRole('button', { name: 'UNDER REVIEW →' }))
    fireEvent.click(screen.getByRole('button', { name: '✎ KOMENTAR' }))
    expect(onMove).toHaveBeenCalledWith(task)
    expect(onComment).toHaveBeenCalledWith(task)
  })

  it('tanpa status berikutnya tidak ada tombol pindah', () => {
    render(<MyTaskRow task={{ ...task, next_status: null }} canMove canComment onMove={vi.fn()} onComment={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /→/ })).not.toBeInTheDocument()
  })

  it('tanpa izin ubah dan komentar tampil keterangan hanya baca', () => {
    render(<MyTaskRow task={task} canMove={false} canComment={false} onMove={vi.fn()} onComment={vi.fn()} />)
    expect(screen.getByText(/Hanya baca/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
