import { describe, expect, it } from 'vitest'

import type { Capabilities } from '@/features/context/types'

import { capabilityStrip } from './capabilityStrip'

const caps = (over: Partial<Capabilities>): Capabilities => ({
  create_task: false, edit_own_task: false, comment: false, log_time: false, attach: false,
  manage_project: false, manage_rules: false, manage_members: false, approve_task: false, ...over,
})

describe('capabilityStrip', () => {
  it('Approver: ungu dengan catatan desain', () => {
    expect(capabilityStrip(caps({ comment: true, attach: true, approve_task: true }), 'approver')).toEqual({
      label: 'AKSES APPROVER',
      note: 'Dapat menyetujui atau menolak task pada tahap review dan berkomentar. Tidak dapat mengubah isi task.',
      tone: 'border-violet text-violet',
    })
  })
  it('Editor: mint dengan catatan Editor', () => {
    const s = capabilityStrip(caps({ edit_own_task: true, comment: true, log_time: true }), 'editor')
    expect(s.label).toBe('AKSES EDITOR')
    expect(s.tone).toBe('border-mint text-mint')
    expect(s.note).toContain('mencatat waktu')
  })
  it('Viewer: abu-abu HANYA BACA', () => {
    const s = capabilityStrip(caps({}), 'viewer')
    expect(s.label).toBe('AKSES VIEWER · HANYA BACA')
    expect(s.tone).toContain('text-muted')
    expect(s.note).toContain('Hanya dapat melihat')
  })
  it('PM/Admin Workspace (approve_task + edit_own_task + manage_project): label role tanpa catatan', () => {
    const s = capabilityStrip(caps({ approve_task: true, edit_own_task: true, manage_project: true }), 'project_manager')
    expect(s).toMatchObject({ label: 'AKSES PROJECT MANAGER', note: '' })
  })
  it('konteks belum termuat: label bawaan editor, tanpa catatan', () => {
    expect(capabilityStrip(undefined, undefined)).toMatchObject({ label: 'AKSES EDITOR', note: '' })
  })
})
