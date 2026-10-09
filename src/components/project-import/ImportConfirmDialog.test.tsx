import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ImportConfirmDialog from './ImportConfirmDialog'

const base = { open: true, kind: 'task' as const, projectName: 'QuestLog', fileName: 'task.csv', validCount: 21, skippedCount: 7 }

describe('ImportConfirmDialog', () => {
  it('menampilkan nama project, jumlah dibuat dan dilewati', () => {
    render(<ImportConfirmDialog {...base} onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByText('QuestLog')).toBeInTheDocument()
    expect(screen.getByText('PROJECT TUJUAN')).toBeInTheDocument()
    expect(screen.getByText(/akan dibuat/)).toHaveTextContent('21 task akan dibuat')
    expect(screen.getByText(/dilewati dan tidak diimpor/)).toHaveTextContent('7 baris dilewati')
    expect(screen.getByText(/task\.csv/)).toBeInTheDocument()
  })

  it('menyembunyikan baris dilewati bila 0', () => {
    render(<ImportConfirmDialog {...base} skippedCount={0} onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.queryByText(/dilewati dan tidak diimpor/)).not.toBeInTheDocument()
  })

  it('Ya, Jalankan Import memanggil onConfirm; Batal memanggil onClose', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(<ImportConfirmDialog {...base} onClose={onClose} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ya, Jalankan Import' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('tombol konfirmasi nonaktif selama nama project belum diketahui', () => {
    render(<ImportConfirmDialog {...base} projectName="" onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Ya, Jalankan Import' })).toBeDisabled()
  })
})
