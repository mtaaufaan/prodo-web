import { describe, expect, it } from 'vitest'

import type { Capabilities } from '@/features/context/types'
import type { Task } from '@/features/tasks/types'

import { FULL_TASK_ACCESS, taskDetailAccess } from './taskDetailAccess'

const caps = (over: Partial<Capabilities>): Capabilities => ({
  create_task: false,
  edit_own_task: false,
  comment: false,
  log_time: false,
  attach: false,
  manage_project: false,
  manage_rules: false,
  manage_members: false,
  approve_task: false,
  ...over,
})

const task = (over: Partial<Task>): Task => ({ id: 't1', assignees: [], active_pics: [], ...over }) as Task
const mine = task({ assignees: [{ user_id: 'u1' } as Task['assignees'][number]] })
const editor = caps({ edit_own_task: true, comment: true, attach: true })

describe('taskDetailAccess', () => {
  it('PM/AW dan konteks belum termuat = akses penuh', () => {
    expect(taskDetailAccess(caps({ manage_project: true }), task({}), 'u1')).toEqual(FULL_TASK_ACCESS)
    expect(taskDetailAccess(undefined, task({}), 'u1')).toEqual(FULL_TASK_ACCESS)
  })

  it('Editor pada task miliknya: ubah/lampir/pindah boleh, hapus task dan hapus PIC tidak', () => {
    const a = taskDetailAccess(editor, mine, 'u1')
    expect(a).toMatchObject({ readOnly: false, canMove: true, canAttach: true, canComment: true, canDelete: false, canRemovePic: false, canApproveTime: false, readOnlyReason: '' })
  })

  it('story point Editor mengikuti setting project; PM/AW selalu boleh (S6E-08)', () => {
    expect(taskDetailAccess(editor, mine, 'u1').canSetStoryPoints).toBe(false)
    expect(taskDetailAccess(editor, mine, 'u1', true).canSetStoryPoints).toBe(true)
    expect(taskDetailAccess(caps({ manage_project: true }), mine, 'u1').canSetStoryPoints).toBe(true)
    expect(taskDetailAccess(editor, mine, 'u2', true).canSetStoryPoints).toBe(false) // task orang lain
  })

  it('PIC aktif juga dianggap pemilik', () => {
    const t = task({ active_pics: [{ user_id: 'u1', is_active: true } as Task['active_pics'][number]] })
    expect(taskDetailAccess(editor, t, 'u1').readOnly).toBe(false)
  })

  it('Editor pada task orang lain: read-only, tetap boleh komentar, ada alasan', () => {
    const a = taskDetailAccess(editor, mine, 'u2')
    expect(a).toMatchObject({ readOnly: true, canMove: false, canAttach: false, canComment: true, canDelete: false })
    expect(a.readOnlyReason).toContain('bukan milik Anda')
  })

  it('Editor tanpa izin lampiran/komentar mengikuti capabilities', () => {
    expect(taskDetailAccess(caps({ edit_own_task: true }), mine, 'u1')).toMatchObject({ canAttach: false, canComment: false })
  })

  it('role baca-saja (Approver/Division Viewer): read-only, komentar sesuai capabilities', () => {
    const a = taskDetailAccess(caps({ comment: true }), mine, 'u1')
    expect(a).toMatchObject({ readOnly: true, canMove: false, canAttach: false, canComment: true })
  })
})
