import { describe, expect, it } from 'vitest'

import type { Capabilities } from '@/features/context/types'
import type { Task } from '@/features/tasks/types'

import { boardModeFor, canActOn, canToggleComplete } from './tasks/boardMode'
import { taskDetailAccess } from './tasks/taskDetailAccess'
import { editorNavItems, isEditorPath } from './workspaceNav'

// S6E-15 (IG-146): kolom Editor `rbac_matrix.xlsx` v4.1 dari sisi UI. Penegak sebenarnya tetap backend
// (service/editor_rbac_matrix_test.go, cmd/api/routes_guard_test.go); di sini dikunci apa yang tampil dan bisa diklik.
const WS = 'w1'
const EDITOR: Capabilities = { create_task: true, edit_own_task: true, comment: true, log_time: true, attach: true, manage_project: false, manage_rules: false, manage_members: false, approve_task: false }

const task = (over: Partial<Task>): Task =>
  ({ id: 't1', status_name: 'IN PROGRESS', assignees: [], active_pics: [], ...over }) as unknown as Task
const mine = task({ assignees: [{ user_id: 'me' }] as never })
const theirs = task({ assignees: [{ user_id: 'lain' }] as never })

describe('matriks Editor -- navigasi dan rute', () => {
  it('menu Editor hanya Board, Task Saya, Timesheet, Lampiran Saya (tanpa menu PM/AW)', () => {
    expect(editorNavItems(WS, 'p1').map((n) => n.label)).toEqual(['Board', 'Task Saya', 'Timesheet', 'Lampiran Saya'])
  })

  it.each([
    `/workspaces/${WS}/board`,
    `/workspaces/${WS}/my-timesheet`,
    `/workspaces/${WS}/my-attachments`,
    `/workspaces/${WS}/account`,
    `/workspaces/${WS}/projects/p1/board`,
    `/workspaces/${WS}/projects/p1/my-tasks`,
  ])('rute Editor %s diizinkan', (path) => {
    expect(isEditorPath(path, WS)).toBe(true)
  })

  it.each([
    ['No 7 sprint', `/workspaces/${WS}/projects/p1/sprints`],
    ['No 3a member project', `/workspaces/${WS}/projects/p1/members`],
    ['No 3 member workspace', `/workspaces/${WS}/members`],
    ['No 16a status project', `/workspaces/${WS}/projects/p1/statuses`],
    ['No 16 status workspace', `/workspaces/${WS}/statuses`],
    ['No 23 rule workspace', `/workspaces/${WS}/rules`],
    ['No 24 rule project', `/workspaces/${WS}/projects/p1/rules`],
    ['No 25a import', `/workspaces/${WS}/projects/p1/import`],
    ['No 27 timesheet PM', `/workspaces/${WS}/projects/p1/timesheet`],
    ['No 27a performance project', `/workspaces/${WS}/projects/p1/performance`],
    ['No 27a performance workspace', `/workspaces/${WS}/performance`],
    ['No 29 webhook', `/workspaces/${WS}/webhooks`],
    ['No 30 audit workspace', `/workspaces/${WS}/audit-trail`],
    ['No 30 audit project', `/workspaces/${WS}/projects/p1/audit`],
    ['No 19a cooldown mention', `/workspaces/${WS}/cooldown-mention`],
    ['No 12a PIC group', `/workspaces/${WS}/projects/p1/pic-groups`],
    ['dokumen AW', `/workspaces/${WS}/documents`],
    ['dokumen project PM', `/workspaces/${WS}/projects/p1/documents`],
    ['No 6 project', `/workspaces/${WS}/projects`],
  ])('rute %s dialihkan dari Editor', (_label, path) => {
    expect(isEditorPath(path, WS)).toBe(false)
  })
})

describe('matriks Editor -- Board dan Task Detail', () => {
  const mode = boardModeFor(EDITOR)

  it('No 9/10: hanya task milik sendiri yang bisa diubah/dipindah; tanpa bulk (catatan 17)', () => {
    expect(mode).toEqual({ limitToMine: true, readOnly: false, bulk: false })
    expect(canActOn(mode, mine, 'me')).toBe(true)
    expect(canActOn(mode, theirs, 'me')).toBe(false)
  })

  it('No 10: tandai lengkap hanya PIC aktif task BACKLOG', () => {
    expect(canToggleComplete(mode, task({ status_name: 'IN PROGRESS' }), 'me')).toBe(false)
    expect(canToggleComplete(mode, task({ status_name: 'BACKLOG', active_pics: [{ user_id: 'me', is_active: true }] as never }), 'me')).toBe(true)
  })

  it('task milik sendiri: ubah, lampiran, komentar boleh; hapus task/hapus PIC/approve waktu tidak (No 14, 12, 27)', () => {
    const a = taskDetailAccess(EDITOR, mine, 'me')
    expect(a).toMatchObject({ readOnly: false, canMove: true, canAttach: true, canComment: true, canDelete: false, canRemovePic: false, canApproveTime: false })
  })

  it('No 10a: Story Point hanya bila project mengizinkan', () => {
    expect(taskDetailAccess(EDITOR, mine, 'me', false).canSetStoryPoints).toBe(false)
    expect(taskDetailAccess(EDITOR, mine, 'me', true).canSetStoryPoints).toBe(true)
  })

  it('task orang lain: baca + komentar saja (No 14a, 18), tanpa ubah/lampiran', () => {
    const a = taskDetailAccess(EDITOR, theirs, 'me', true)
    expect(a).toMatchObject({ readOnly: true, canMove: false, canAttach: false, canComment: true, canDelete: false, canSetStoryPoints: false })
    expect(a.readOnlyReason).toContain('bukan milik Anda')
  })
})
