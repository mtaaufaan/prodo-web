import { describe, expect, it } from 'vitest'

import type { CustomStatus } from '@/features/tasks/types'

import { buildRows, filterRows, pageWindow } from './rows'
import type { PicGroupMember } from './types'

const status = (id: string, name: string, position: number): CustomStatus => ({
  id,
  name,
  color_token: null,
  position,
  is_system: false,
  is_undefined: false,
  require_start_confirmation: false,
  require_pic: true,
  task_count: 0,
})

const member = (statusId: string, userId: string, name: string): PicGroupMember => ({
  project_id: 'p1',
  status_id: statusId,
  user_id: userId,
  user_name: name,
  user_email: `${userId}@rds.co.id`,
  added_by: null,
  created_at: '2026-10-03T00:00:00Z',
})

describe('buildRows', () => {
  const rows = buildRows(
    [status('s2', 'IN PROGRESS', 2), status('s1', 'BACKLOG', 1), status('s3', 'DONE', 3)],
    [member('s2', 'u1', 'Budi'), member('s2', 'u2', 'Sari')],
  )

  it('urut posisi, anggota digabung per status', () => {
    expect(rows.map((r) => r.name)).toEqual(['BACKLOG', 'IN PROGRESS', 'DONE'])
    expect(rows[1].members.map((m) => m.name)).toEqual(['Budi', 'Sari'])
  })

  it('ada anggota = TERBATAS, kosong = FULL', () => {
    expect(rows.map((r) => r.mode)).toEqual(['FULL', 'TERBATAS', 'FULL'])
  })

  it('nama kosong jatuh ke email', () => {
    const r = buildRows([status('s1', 'A', 1)], [{ ...member('s1', 'u9', ''), user_name: '' }])
    expect(r[0].members[0].name).toBe('u9@rds.co.id')
  })
})

describe('filterRows', () => {
  const rows = buildRows(
    [status('s1', 'BACKLOG', 1), status('s2', 'IN PROGRESS', 2), status('s3', 'REVIEW', 3)],
    [member('s2', 'u1', 'Budi'), member('s3', 'u2', 'Sari')],
  )

  it('Semua/Semua tidak menyaring', () => {
    expect(filterRows(rows, 'Semua', 'Semua')).toHaveLength(3)
  })

  it('filter mode', () => {
    expect(filterRows(rows, 'Terbatas', 'Semua').map((r) => r.name)).toEqual(['IN PROGRESS', 'REVIEW'])
    expect(filterRows(rows, 'Full', 'Semua').map((r) => r.name)).toEqual(['BACKLOG'])
  })

  it('filter anggota', () => {
    expect(filterRows(rows, 'Semua', 'u2').map((r) => r.name)).toEqual(['REVIEW'])
  })

  it('gabungan mode + anggota', () => {
    expect(filterRows(rows, 'Full', 'u1')).toEqual([])
  })
})

describe('pageWindow', () => {
  it('maksimal 5 nomor di sekitar halaman aktif', () => {
    expect(pageWindow(5, 10)).toEqual([3, 4, 5, 6, 7])
  })
  it('dijepit di awal dan akhir tetap 5 nomor', () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(10, 10)).toEqual([6, 7, 8, 9, 10])
  })
  it('kurang dari 5 halaman', () => {
    expect(pageWindow(1, 2)).toEqual([1, 2])
  })
})
