import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import Grid1Pager from './Grid1Pager'

describe('Grid1Pager', () => {
  it('disembunyikan bila data muat di satu halaman', () => {
    const { container } = render(<Grid1Pager page={1} perPage={10} total={10} onPage={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('menampilkan total data dan menonaktifkan tombol di batas halaman', () => {
    const { rerender } = render(<Grid1Pager page={1} perPage={10} total={25} onPage={vi.fn()} />)
    expect(screen.getByText(/\/ 3 · 25 data/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sblm/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /brkt/i })).toBeEnabled()

    rerender(<Grid1Pager page={3} perPage={10} total={25} onPage={vi.fn()} />)
    expect(screen.getByRole('button', { name: /brkt/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /sblm/i })).toBeEnabled()
  })

  it('lompat halaman lewat Enter dan tombol Ke, dijepit ke rentang', () => {
    const onPage = vi.fn()
    render(<Grid1Pager page={1} perPage={10} total={25} onPage={onPage} />)
    const input = screen.getByLabelText('Nomor halaman')

    fireEvent.change(input, { target: { value: '2' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onPage).toHaveBeenLastCalledWith(2)

    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ke' }))
    expect(onPage).toHaveBeenLastCalledWith(3)

    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ke' }))
    expect(onPage).toHaveBeenLastCalledWith(1)
  })
})
