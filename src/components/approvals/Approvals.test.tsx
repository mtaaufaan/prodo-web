import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ApprovalItem } from '@/features/approvals/types'

import ApprovalDecisionModal from './ApprovalDecisionModal'
import ApprovalRow from './ApprovalRow'

const item = (over: Partial<ApprovalItem> = {}): ApprovalItem => ({
  task_id: 't1', task_code: 'QST-101', title: 'Rekonsiliasi vendor Q3', project_id: 'p1', status_name: 'UNDER REVIEW', status_color: 'violet',
  priority: 'high', sprint_name: 'Sprint 1', due_date: '2026-10-12', pic_names: ['Sinta A.'], comment_count: 3, sub_total: 4, sub_done: 4,
  logged_hours: 9, estimate_hours: 8, decision: null, decided_at: null, decision_note: null, ...over,
})

describe('ApprovalDecisionModal', () => {
  const setup = (mode: 'approve' | 'reject', onConfirm = vi.fn().mockResolvedValue('')) => {
    const onClose = vi.fn()
    render(<ApprovalDecisionModal mode={mode} code="QST-101" taskTitle="Rekonsiliasi vendor Q3" pic="Sinta A." onConfirm={onConfirm} onClose={onClose} />)
    return { onConfirm, onClose, box: screen.getByRole('textbox') }
  }

  it('mode setuju: judul, subjudul, dampak, catatan opsional; konfirmasi tanpa catatan', async () => {
    const { onConfirm } = setup('approve')
    expect(screen.getByText('Setujui QST-101 — Rekonsiliasi vendor Q3')).toBeInTheDocument()
    expect(screen.getByText('Status saat ini UNDER REVIEW · PIC Sinta A.')).toBeInTheDocument()
    expect(screen.getByText(/Task dipindahkan ke DONE/)).toBeInTheDocument()
    expect(screen.getByText('CATATAN · OPSIONAL')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '✓ SETUJUI TASK' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(''))
  })

  it('mode tolak: alasan wajib; < 5 karakter menampilkan galat persis desain dan tidak terkirim', () => {
    const { onConfirm, box } = setup('reject')
    expect(screen.getByText('ALASAN PENOLAKAN · WAJIB')).toBeInTheDocument()
    expect(screen.getByText(/dikembalikan ke IN PROGRESS/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '✕ TOLAK TASK' }))
    expect(screen.getByText(/Alasan penolakan minimal 5 karakter agar assignee tahu apa yang perlu diperbaiki\./)).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.change(box, { target: { value: 'abc' } })
    expect(screen.queryByText(/minimal 5 karakter/)).not.toBeInTheDocument() // galat hilang saat mengetik
  })

  it('tolak dengan alasan terkirim ter-trim', async () => {
    const { onConfirm, box } = setup('reject')
    fireEvent.change(box, { target: { value: '  perbaiki bagian itu  ' } })
    fireEvent.click(screen.getByRole('button', { name: '✕ TOLAK TASK' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('perbaiki bagian itu'))
  })

  it('galat server tampil di dalam modal dan modal tetap terbuka', async () => {
    const { onClose, box } = setup('reject', vi.fn().mockResolvedValue('Task ini sudah tidak berstatus UNDER REVIEW.'))
    fireEvent.change(box, { target: { value: 'alasan cukup' } })
    fireEvent.click(screen.getByRole('button', { name: '✕ TOLAK TASK' }))
    expect(await screen.findByText(/sudah tidak berstatus UNDER REVIEW/)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('input dipotong 1000 karakter; BATAL dan ✕ menutup', () => {
    const { onClose, box } = setup('approve')
    fireEvent.change(box, { target: { value: 'x'.repeat(1200) } })
    expect(screen.getByText('1000 / 1000')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'BATAL' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('ApprovalRow', () => {
  it('menampilkan meta, progres (merah bila jam > estimasi) dan aksi bagi yang boleh memutuskan', () => {
    const onDecide = vi.fn()
    render(<ApprovalRow item={item()} canDecide onDecide={onDecide} />)
    expect(screen.getByText('SPRINT 1 · DUE 12/10/2026 · PIC Sinta A. · 3 KOMENTAR')).toBeInTheDocument()
    expect(screen.getByText('4/4 SUB-TASK SELESAI')).toBeInTheDocument()
    expect(screen.getByText('9J / 8J')).toHaveClass('text-red')
    fireEvent.click(screen.getByRole('button', { name: '✓ SETUJUI' }))
    fireEvent.click(screen.getByRole('button', { name: '✕ TOLAK' }))
    expect(onDecide).toHaveBeenNthCalledWith(1, expect.objectContaining({ task_id: 't1' }), 'approve')
    expect(onDecide).toHaveBeenNthCalledWith(2, expect.objectContaining({ task_id: 't1' }), 'reject')
  })

  it('baris yang sudah diputuskan: badge keputusan dan kunci tanpa aksi', () => {
    render(<ApprovalRow item={item({ decision: 'rejected', status_name: 'IN PROGRESS' })} canDecide onDecide={vi.fn()} />)
    expect(screen.getByText('DITOLAK')).toBeInTheDocument()
    expect(screen.getByText(/Sudah diputuskan/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '✓ SETUJUI' })).not.toBeInTheDocument()
  })

  it('tanpa kemampuan approve_task: terkunci baca-saja', () => {
    render(<ApprovalRow item={item()} canDecide={false} onDecide={vi.fn()} />)
    expect(screen.queryByRole('button', { name: '✕ TOLAK' })).not.toBeInTheDocument()
    expect(screen.getByText(/Hanya baca/)).toBeInTheDocument()
  })

  it('tanpa sub-task dan estimasi: bar progres disembunyikan', () => {
    render(<ApprovalRow item={item({ sub_total: 0, sub_done: 0, estimate_hours: 0, logged_hours: 0 })} canDecide onDecide={vi.fn()} />)
    expect(screen.queryByText(/SUB-TASK/)).not.toBeInTheDocument()
  })
})
