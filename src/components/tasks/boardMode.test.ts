import { describe, expect, it } from 'vitest'

import type { Capabilities } from '@/features/context/types'
import type { Task } from '@/features/tasks/types'

import { boardModeFor, canActOn, canToggleComplete, dueBucket, FULL_BOARD_MODE, isOwnTask } from './boardMode'

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

const task = (over: Partial<Task>): Task =>
  ({
    id: 't1',
    status_name: 'IN PROGRESS',
    due_date: '2026-10-20',
    assignees: [],
    active_pics: [],
    ...over,
  }) as Task

const pic = (userId: string, active = true) => ({ user_id: userId, is_active: active }) as Task['active_pics'][number]
const assignee = (userId: string) => ({ user_id: userId }) as Task['assignees'][number]

describe('boardModeFor', () => {
  it('PM/AW (manage_project) dan belum termuat = mode penuh dengan bulk', () => {
    expect(boardModeFor(caps({ manage_project: true, edit_own_task: true }))).toEqual(FULL_BOARD_MODE)
    expect(boardModeFor(undefined)).toEqual(FULL_BOARD_MODE)
  })
  it('Editor = limitToMine tanpa bulk', () => {
    expect(boardModeFor(caps({ edit_own_task: true, comment: true }))).toEqual({ limitToMine: true, readOnly: false, bulk: false })
  })
  it('Approver/Viewer/Division Viewer = baca saja', () => {
    expect(boardModeFor(caps({ comment: true }))).toEqual({ limitToMine: false, readOnly: true, bulk: false })
    expect(boardModeFor(caps({}))).toEqual({ limitToMine: false, readOnly: true, bulk: false })
  })
  it('Approver (comment + attach + approve_task, S7A-02) tetap baca saja di Board', () => {
    expect(boardModeFor(caps({ comment: true, attach: true, approve_task: true }))).toEqual({ limitToMine: false, readOnly: true, bulk: false })
  })
})

describe('kepemilikan task', () => {
  it('milik saya = assignee atau PIC aktif (PIC nonaktif bukan)', () => {
    expect(isOwnTask(task({ assignees: [assignee('me')] }), 'me')).toBe(true)
    expect(isOwnTask(task({ active_pics: [pic('me')] }), 'me')).toBe(true)
    expect(isOwnTask(task({ active_pics: [pic('me', false)] }), 'me')).toBe(false)
    expect(isOwnTask(task({ assignees: [assignee('lain')] }), 'me')).toBe(false)
    expect(isOwnTask(task({ assignees: [assignee('me')] }), undefined)).toBe(false)
  })

  it('canActOn: Editor hanya task miliknya; PM semua; baca-saja tidak ada', () => {
    const own = task({ assignees: [assignee('me')] })
    const other = task({ assignees: [assignee('lain')] })
    const editor = { limitToMine: true, readOnly: false, bulk: false }
    expect(canActOn(editor, own, 'me')).toBe(true)
    expect(canActOn(editor, other, 'me')).toBe(false)
    expect(canActOn(FULL_BOARD_MODE, other, 'me')).toBe(true)
    expect(canActOn({ limitToMine: false, readOnly: true, bulk: false }, own, 'me')).toBe(false)
  })

  it('canToggleComplete: hanya PIC aktif task BACKLOG (aturan NOT_BACKLOG_PIC)', () => {
    const backlogPic = task({ status_name: 'BACKLOG', active_pics: [pic('me')] })
    expect(canToggleComplete(FULL_BOARD_MODE, backlogPic, 'me')).toBe(true)
    expect(canToggleComplete(FULL_BOARD_MODE, task({ status_name: 'BACKLOG', assignees: [assignee('me')] }), 'me')).toBe(false)
    expect(canToggleComplete(FULL_BOARD_MODE, task({ status_name: 'IN PROGRESS', active_pics: [pic('me')] }), 'me')).toBe(false)
    expect(canToggleComplete({ limitToMine: false, readOnly: true, bulk: false }, backlogPic, 'me')).toBe(false)
  })
})

describe('dueBucket', () => {
  const today = '2026-10-16'
  it('mengelompokkan sesuai desain', () => {
    expect(dueBucket(task({ due_date: null }), today)).toBe('Tanpa tanggal')
    expect(dueBucket(task({ due_date: '2026-10-10' }), today)).toBe('Terlambat')
    expect(dueBucket(task({ due_date: '2026-10-10', status_name: 'DONE' }), today)).toBe('7 hari')
    expect(dueBucket(task({ due_date: '2026-10-16' }), today)).toBe('7 hari')
    expect(dueBucket(task({ due_date: '2026-10-23' }), today)).toBe('7 hari')
    expect(dueBucket(task({ due_date: '2026-10-24' }), today)).toBe('> 7 hari')
  })
})
