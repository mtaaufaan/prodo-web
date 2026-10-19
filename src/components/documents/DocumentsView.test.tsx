import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Attachment } from '@/features/attachments/types'

import DocumentsView from './DocumentsView'

const m = vi.hoisted(() => ({
  mine: [] as unknown[],
  deleteOwn: vi.fn(),
  download: vi.fn(),
  rename: vi.fn(),
  idle: () => ({ mutate: vi.fn(), isPending: false }),
  q: (data: unknown) => ({ data, isLoading: false, refetch: vi.fn() }),
}))

vi.mock('@/features/attachments/api', () => ({ downloadAttachment: m.download, renameAttachment: m.rename }))
vi.mock('@/features/attachments/hooks', () => ({
  useMyAttachments: () => m.q(m.mine),
  useWorkspaceDocuments: () => m.q(m.mine),
  useProjectDocuments: () => m.q(m.mine),
  useDocumentsQuota: () => m.q({ quota_bytes: 10 * 1024 ** 3, used_bytes: 1024 ** 3, retention_days: 30, per_project: [] }),
  useProjectDocumentsQuota: () => m.q({ quota_bytes: 10 * 1024 ** 3, used_bytes: 1024 ** 3, retention_days: 30, project_bytes: 0, project_file_count: 0 }),
  useDeleteOwnAttachment: () => ({ mutate: m.deleteOwn, isPending: false }),
  useDeleteDocument: m.idle,
  useBulkDeleteDocuments: m.idle,
  useBulkDeleteProjectDocuments: m.idle,
  useRestoreDocument: m.idle,
  useRequestQuota: m.idle,
}))
vi.mock('@/features/projects/hooks', () => ({ useProjects: () => m.q([{ id: 'pa', name: 'QuestLog', is_archived: false }]) }))

const att = (id: string, name: string, over: Partial<Attachment> = {}): Attachment => ({
  id,
  task_id: 't1',
  uploader_id: 'me',
  uploader_name: 'Eka',
  uploader_email: 'eka@x.id',
  original_name: name,
  display_name: name,
  mime_type: 'application/pdf',
  size_bytes: 2048,
  is_image: false,
  created_at: '2026-10-10T00:00:00Z',
  deleted_at: null,
  purge_scheduled_at: null,
  status: 'active',
  task_code: 'QST-001',
  task_title: 'Rancang login',
  project_id: 'pa',
  project_name: 'QuestLog',
  sprint_name: null,
  ...over,
})

const mine = () => render(<DocumentsView scope={{ kind: 'mine', workspaceId: 'w1' }} />)

beforeEach(() => {
  m.mine = [
    att('1', 'wireframe.pdf'),
    att('2', 'proposal.docx', { project_id: 'pb', project_name: 'PRODO' }),
    att('3', 'lama.csv', { status: 'deleted', deleted_at: '2026-10-09T00:00:00Z' }),
  ]
  m.deleteOwn.mockReset()
  m.download.mockReset()
  m.rename.mockReset()
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {}) // jsdom: navigasi unduhan tidak ada
})

describe('DocumentsView mode Lampiran Saya (Editor)', () => {
  it('menampilkan file saya lintas project tanpa panel kuota, pilih-massal, dan filter pengunggah', () => {
    mine()
    expect(screen.getByText('wireframe.pdf')).toBeInTheDocument()
    expect(screen.getByText('proposal.docx')).toBeInTheDocument()
    expect(screen.queryByText('lama.csv')).not.toBeInTheDocument() // default: aktif & orphan
    expect(screen.getByText('Unggahan Anda')).toBeInTheDocument()
    expect(screen.getByText(/Hanya file yang Anda unggah/)).toBeInTheDocument()
    expect(screen.queryByText('KUOTA LAMPIRAN')).not.toBeInTheDocument()
    expect(screen.queryByText('◻')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('FILTER'))
    expect(screen.getAllByText('PENGUNGGAH')).toHaveLength(1) // hanya header kolom, tanpa dropdown filter
    expect(screen.getByText('PROJECT')).toBeInTheDocument()
  })

  it('filter project mempersempit daftar dari project pada file saya sendiri', () => {
    mine()
    fireEvent.click(screen.getByText('FILTER'))
    const select = screen.getByText('PROJECT').parentElement!.querySelector('select')!
    expect(Array.from(select.options).map((o) => o.text)).toEqual(['Semua', 'QuestLog', 'PRODO'])
    fireEvent.change(select, { target: { value: 'pb' } })
    expect(screen.queryByText('wireframe.pdf')).not.toBeInTheDocument()
    expect(screen.getByText('proposal.docx')).toBeInTheDocument()
  })

  it('file terhapus hanya bisa diunduh: tanpa Rename, Hapus, maupun Pulihkan', () => {
    mine()
    fireEvent.click(screen.getByText('FILTER'))
    fireEvent.change(screen.getByText('STATUS').parentElement!.querySelector('select')!, { target: { value: 'deleted' } })
    expect(screen.getByText('lama.csv')).toBeInTheDocument()
    expect(screen.getByText('Unduh')).toBeInTheDocument()
    expect(screen.queryByText('Rename')).not.toBeInTheDocument()
    expect(screen.queryByText('Hapus')).not.toBeInTheDocument()
    expect(screen.queryByText('Pulihkan')).not.toBeInTheDocument()
  })

  it('hapus hanya mode retensi (tanpa permanen) dan mengirim id file sendiri', () => {
    mine()
    fireEvent.click(screen.getAllByText('Hapus')[0])
    expect(screen.getByText(/RETENSI \(DEFAULT\)/)).toBeInTheDocument()
    expect(screen.queryByText(/PERMANEN/)).not.toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Hapus' })
    fireEvent.click(buttons[buttons.length - 1]) // tombol konfirmasi di modal
    expect(m.deleteOwn).toHaveBeenCalledTimes(1)
    expect(m.deleteOwn.mock.calls[0][0]).toBe('1')
  })

  it('rename menolak nama kosong dan nama lebih dari 255 karakter, lalu menyimpan nama valid', async () => {
    m.rename.mockResolvedValue({ id: '1' })
    mine()
    fireEvent.click(screen.getAllByText('Rename')[0])
    const input = screen.getByDisplayValue('wireframe.pdf')
    expect(input).toHaveAttribute('maxlength', '255')
    fireEvent.change(input, { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Simpan Nama' })).toBeDisabled()
    fireEvent.change(input, { target: { value: 'wireframe-v2.pdf' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Nama' }))
    await waitFor(() => expect(m.rename).toHaveBeenCalledWith('1', 'wireframe-v2.pdf'))
  })

  it('unduh memanggil API; kegagalan tampil sebagai pesan error', async () => {
    m.download.mockResolvedValueOnce(new Blob(['x']))
    mine()
    fireEvent.click(screen.getAllByText('Unduh')[0])
    await waitFor(() => expect(screen.getByText(/wireframe.pdf diunduh/)).toBeInTheDocument())
    m.download.mockRejectedValueOnce(new Error('putus'))
    fireEvent.click(screen.getAllByText('Unduh')[0])
    await waitFor(() => expect(screen.getByText(/Gagal mengunduh wireframe.pdf/)).toBeInTheDocument())
  })

  it('daftar kosong menampilkan teks kosong dari desain', () => {
    m.mine = []
    mine()
    expect(screen.getByText(/File melekat pada task/)).toBeInTheDocument()
  })
})

describe('DocumentsView regresi AW dan PM', () => {
  it('cakupan workspace (AW): kuota, pilih-massal, filter pengunggah, dan hapus permanen tetap ada', () => {
    render(<DocumentsView scope={{ kind: 'workspace', workspaceId: 'w1' }} />)
    expect(screen.getByText('KUOTA LAMPIRAN')).toBeInTheDocument()
    expect(screen.getAllByText('◻').length).toBeGreaterThan(0)
    expect(screen.getByText('Seluruh workspace')).toBeInTheDocument()
    fireEvent.click(screen.getByText('FILTER'))
    expect(screen.getAllByText('PENGUNGGAH')).toHaveLength(2) // header kolom + dropdown filter
    fireEvent.click(screen.getAllByText('Hapus')[0])
    expect(screen.getByText(/PERMANEN/)).toBeInTheDocument()
  })

  it('cakupan project (PM): kuota ada, hapus permanen tidak ada, filter project tidak ada', () => {
    render(<DocumentsView scope={{ kind: 'project', projectId: 'pa' }} />)
    expect(screen.getByText('KUOTA LAMPIRAN')).toBeInTheDocument()
    expect(screen.getByText('Project ini')).toBeInTheDocument()
    fireEvent.click(screen.getByText('FILTER'))
    expect(screen.queryByText('PROJECT')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByText('Hapus')[0])
    expect(screen.queryByText(/PERMANEN/)).not.toBeInTheDocument()
  })
})
