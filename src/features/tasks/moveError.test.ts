import { describe, expect, it } from 'vitest'

import { describeCompleteError, describeMoveError } from './moveError'

describe('describeMoveError', () => {
  it('hak akses Editor (S6E-06)', () => {
    expect(describeMoveError({ code: 'NOT_YOUR_TASK' })).toBe('Anda hanya dapat mengubah task yang ditugaskan kepada Anda.')
    expect(describeMoveError({ code: 'BULK_NOT_ALLOWED' })).toBe('Role Anda tidak dapat memakai aksi bulk.')
  })
  it('galat lama tidak berubah', () => {
    expect(describeMoveError({ code: 'TASK_INCOMPLETE' })).toContain('Belum Lengkap')
    expect(describeMoveError({ code: 'DEPENDENCY_HARD_BLOCK', details: { blocking_tasks: [{ task_code: 'A-1', title: 'X' }] } })).toContain('A-1 (X)')
    expect(describeMoveError(new Error('x'))).toBe('Gagal mengubah status task.')
  })
})

describe('describeCompleteError', () => {
  it('memetakan kode galat', () => {
    expect(describeCompleteError({ code: 'NOT_YOUR_TASK' })).toContain('ditugaskan kepada Anda')
    expect(describeCompleteError({ code: 'NOT_BACKLOG_PIC' })).toContain('PIC backlog')
    expect(describeCompleteError({})).toBe('Gagal mengubah kelengkapan task.')
  })
})
