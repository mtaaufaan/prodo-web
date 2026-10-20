import { describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api'

import { decisionNotice, describeDecisionError, validateDecisionNote } from './approvalRules'

describe('validateDecisionNote', () => {
  it('tolak tanpa alasan atau < 5 karakter ditolak dengan pesan persis desain', () => {
    const msg = 'Alasan penolakan minimal 5 karakter agar assignee tahu apa yang perlu diperbaiki.'
    expect(validateDecisionNote('reject', '')).toBe(msg)
    expect(validateDecisionNote('reject', '   abc  ')).toBe(msg)
    expect(validateDecisionNote('reject', 'abcd')).toBe(msg)
  })
  it('tolak dengan alasan >= 5 karakter (setelah trim) lolos', () => {
    expect(validateDecisionNote('reject', 'abcde')).toBe('')
    expect(validateDecisionNote('reject', '  perbaiki bagian itu ')).toBe('')
  })
  it('setuju: catatan opsional', () => {
    expect(validateDecisionNote('approve', '')).toBe('')
    expect(validateDecisionNote('approve', 'ok')).toBe('')
  })
  it('catatan melewati 1000 karakter ditolak', () => {
    expect(validateDecisionNote('approve', 'x'.repeat(1001))).toMatch(/maksimal 1000/)
    expect(validateDecisionNote('approve', 'x'.repeat(1000))).toBe('')
  })
})

describe('decisionNotice', () => {
  it('teks banner persis desain', () => {
    expect(decisionNotice('approve', 'OPS-142')).toBe('Task OPS-142 disetujui dan dipindahkan ke DONE. Assignee diberi notifikasi.')
    expect(decisionNotice('reject', 'OPS-142')).toBe('Task OPS-142 ditolak dan dikembalikan ke IN PROGRESS. Assignee diberi notifikasi beserta alasan.')
  })
})

describe('describeDecisionError', () => {
  it('memetakan kode server ke pesan', () => {
    expect(describeDecisionError(new ApiError('TASK_NOT_UNDER_REVIEW', 'x'))).toMatch(/sudah tidak berstatus UNDER REVIEW/)
    expect(describeDecisionError(new ApiError('FORBIDDEN', 'x'))).toMatch(/Role Anda/)
    expect(describeDecisionError(new ApiError('NOT_FOUND', 'x'))).toMatch(/tidak ditemukan/)
    expect(describeDecisionError(new ApiError('VALIDATION_ERROR', 'Alasan terlalu pendek'))).toBe('Alasan terlalu pendek')
    expect(describeDecisionError(new Error('jaringan'))).toMatch(/Gagal menyimpan/)
  })
})
