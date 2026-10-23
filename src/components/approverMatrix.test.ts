import { describe, expect, it } from 'vitest'

import { validateDecisionNote } from '@/features/approvals/approvalRules'
import type { Capabilities } from '@/features/context/types'
import { capabilityStrip } from '@/features/my-tasks/capabilityStrip'
import { notificationHref, notificationMeta } from '@/features/notifications/format'
import type { AppNotification } from '@/features/notifications/types'
import type { Task } from '@/features/tasks/types'

import { boardModeFor, canActOn, canToggleComplete } from './tasks/boardMode'
import { taskDetailAccess } from './tasks/taskDetailAccess'
import { approverNavItems, editorNavItems, isApproverPath } from './workspaceNav'

// S7A-14 (IG-160): kolom Approver `rbac_matrix.xlsx` v4.2 dari sisi UI. Penegak sebenarnya tetap backend
// (service/approver_matrix_test.go, cmd/api/approver_routes_test.go); di sini dikunci apa yang tampil dan bisa diklik.
const WS = 'w1'
// Sama dengan service.CapabilitiesForRole("approver"): komentar, lampiran, setujui/tolak; tanpa buat/ubah task, catat waktu, kelola.
const APPROVER: Capabilities = { create_task: false, edit_own_task: false, comment: true, log_time: false, attach: true, manage_project: false, manage_rules: false, manage_members: false, approve_task: true }
const PM: Capabilities = { create_task: true, edit_own_task: true, comment: true, log_time: true, attach: true, manage_project: true, manage_rules: true, manage_members: true, approve_task: true }

const task = (over: Partial<Task>): Task =>
  ({ id: 't1', status_name: 'IN PROGRESS', assignees: [], active_pics: [], ...over }) as unknown as Task
const mine = task({ assignees: [{ user_id: 'me' }] as never, active_pics: [{ user_id: 'me', is_active: true }] as never })
const theirs = task({ assignees: [{ user_id: 'lain' }] as never })

describe('matriks Approver -- navigasi dan rute', () => {
  it('menu Approver hanya Antrean Approval, Board, Task Saya (tanpa menu Editor/PM/AW), tanpa CTA', () => {
    const items = approverNavItems(WS, 'p1')
    expect(items.map((n) => n.label)).toEqual(['Antrean Approval', 'Board', 'Task Saya'])
    expect(items.every((n) => n.cta === null)).toBe(true)
    expect(items.map((n) => n.label)).not.toContain('Timesheet')
    expect(items.map((n) => n.label)).not.toContain('Lampiran Saya')
  })

  it('tanpa project aktif: Task Saya "SEGERA" (project-scoped), antrean dan Board jatuh ke redirect workspace', () => {
    expect(approverNavItems(WS, null).map((n) => n.to)).toEqual([`/workspaces/${WS}/approvals`, `/workspaces/${WS}/board`, null])
  })

  it.each([
    `/workspaces/${WS}/approvals`,
    `/workspaces/${WS}/board`,
    `/workspaces/${WS}/account`,
    `/workspaces/${WS}/projects/p1/approvals`,
    `/workspaces/${WS}/projects/p1/board`,
    `/workspaces/${WS}/projects/p1/my-tasks`,
  ])('rute Approver %s diizinkan', (path) => {
    expect(isApproverPath(path, WS)).toBe(true)
  })

  it.each([
    ['menu Editor: Timesheet (No 26)', `/workspaces/${WS}/my-timesheet`],
    ['menu Editor: Lampiran Saya', `/workspaces/${WS}/my-attachments`],
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
    ['No 12a PIC group', `/workspaces/${WS}/projects/p1/pic-groups`],
    ['dokumen AW', `/workspaces/${WS}/documents`],
    ['dokumen project PM', `/workspaces/${WS}/projects/p1/documents`],
    ['No 6 project', `/workspaces/${WS}/projects`],
  ])('rute %s dialihkan dari Approver', (_label, path) => {
    expect(isApproverPath(path, WS)).toBe(false)
  })

  it('Approver dan Editor memakai himpunan menu yang berbeda (tidak saling membuka)', () => {
    const editor = editorNavItems(WS, 'p1').map((n) => n.label)
    const approver = approverNavItems(WS, 'p1').map((n) => n.label)
    expect(approver.filter((l) => l === 'Timesheet' || l === 'Lampiran Saya')).toEqual([])
    expect(editor).not.toContain('Antrean Approval')
  })
})

describe('matriks Approver -- Board dan Antrean', () => {
  const mode = boardModeFor(APPROVER)

  it('No 9/10: Board baca-saja, tanpa bulk, tidak bisa bertindak atas task mana pun (termasuk miliknya)', () => {
    expect(mode).toEqual({ limitToMine: false, readOnly: true, bulk: false })
    expect(canActOn(mode, mine, 'me')).toBe(false)
    expect(canActOn(mode, theirs, 'me')).toBe(false)
  })

  it('No 10: tidak bisa menandai lengkap walau PIC aktif task BACKLOG', () => {
    const backlogMine = task({ status_name: 'BACKLOG', active_pics: [{ user_id: 'me', is_active: true }] as never })
    expect(canToggleComplete(mode, backlogMine, 'me')).toBe(false)
  })

  it('PM tetap mode penuh (regresi): bulk, bisa bertindak atas semua task', () => {
    const pm = boardModeFor(PM)
    expect(pm).toEqual({ limitToMine: false, readOnly: false, bulk: true })
    expect(canActOn(pm, theirs, 'me')).toBe(true)
  })

  it('No 10c: keputusan setuju opsional, tolak wajib alasan >= 5 karakter dengan pesan desain', () => {
    expect(validateDecisionNote('approve', '')).toBe('')
    expect(validateDecisionNote('reject', 'abc')).toBe('Alasan penolakan minimal 5 karakter agar assignee tahu apa yang perlu diperbaiki.')
    expect(validateDecisionNote('reject', 'Uji ulang pembayaran')).toBe('')
  })
})

describe('matriks Approver -- Task Detail', () => {
  const a = taskDetailAccess(APPROVER, theirs, 'me')

  it('No 9/8/13/10a: field, assignee, dependency, sub-task, Story Point terkunci (readOnly), sama di task milik sendiri', () => {
    for (const t of [mine, theirs]) {
      expect(taskDetailAccess(APPROVER, t, 'me')).toMatchObject({ readOnly: true, canSetStoryPoints: false })
    }
    expect(a.readOnlyReason).toBe('Sebagai Approver Anda dapat mengubah status task, melampirkan berkas, dan berkomentar — namun tidak mengubah judul, deskripsi, atau assignee.')
  })

  it('No 10: chip status terkunci (canMove=false); ubah status hanya lewat keputusan (No 10c: canDecide)', () => {
    expect(a).toMatchObject({ canMove: false, canDecide: true })
    expect(a.statusLockReason).toContain('Setujui/Tolak')
  })

  it('No 10b/12: Mulai Pengerjaan dan PIC hanya bila PIC aktif (canStartWhenPic), serah/tambah PIC tidak lewat UI', () => {
    expect(a.canStartWhenPic).toBe(true)
    expect(a.canRemovePic).toBe(false)
  })

  it('No 14: tidak boleh hapus task; No 18/20/21/22: boleh komentar dan melampirkan', () => {
    expect(a).toMatchObject({ canDelete: false, canComment: true, canAttach: true })
  })

  it('No 26: tidak mencatat waktu dan tidak menyetujui timesheet (No 27)', () => {
    expect(a).toMatchObject({ canLogTime: false, canApproveTime: false })
    expect(a.timeLockReason).toBe('Approver tidak mencatat waktu kerja.')
  })

  it('selain Approver tidak mendapat seksi keputusan: PM/AW (chip status biasa) dan role baca-saja', () => {
    expect(taskDetailAccess(PM, theirs, 'me').canDecide).toBe(false)
    expect(taskDetailAccess({ ...APPROVER, approve_task: false, attach: false, comment: false }, theirs, 'me')).toMatchObject({ canDecide: false, canAttach: false })
  })
})

describe('matriks Approver -- strip kemampuan dan notifikasi', () => {
  it('strip AKSES APPROVER ungu dengan catatan desain', () => {
    expect(capabilityStrip(APPROVER, 'approver')).toMatchObject({ label: 'AKSES APPROVER', tone: 'border-violet text-violet' })
  })

  const base: AppNotification = {
    id: 'n1', type: 'approval_pending', actor_name: 'Budi', title: 't', body: null, entity_type: 'task', entity_id: 'task-1',
    project_id: 'p1', task_code: 'QST-101', project_name: 'QuestLog', is_read: false, created_at: '2026-10-21T00:00:00Z',
  }

  it('◈ APPROVAL untuk approval_pending (ungu), task_approved (mint), task_rejected (merah)', () => {
    expect(notificationMeta('approval_pending')).toMatchObject({ icon: '◈', label: 'APPROVAL', tone: expect.stringContaining('violet') })
    expect(notificationMeta('task_approved')).toMatchObject({ icon: '◈', tone: expect.stringContaining('mint') })
    expect(notificationMeta('task_rejected')).toMatchObject({ icon: '◈', tone: expect.stringContaining('red') })
  })

  it('notifikasi antrean membuka Antrean Approval pada task itu; notifikasi task lain membuka Board', () => {
    expect(notificationHref(base, WS)).toBe(`/workspaces/${WS}/projects/p1/approvals?task=task-1`)
    expect(notificationHref({ ...base, type: 'task_comment' }, WS)).toBe(`/workspaces/${WS}/projects/p1/board?task=task-1`)
  })
})
