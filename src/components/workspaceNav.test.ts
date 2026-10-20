import { describe, expect, it } from 'vitest'

import { approverNavItems, awNavItems, editorNavItems, isApproverPath, isEditorPath, pmNavItems } from './workspaceNav'

const WS = 'w1'

describe('editorNavItems', () => {
  it('punya 4 menu sesuai desain Master UI User (tab + CTA)', () => {
    const items = editorNavItems(WS, 'p1')
    expect(items.map((i) => [i.label, i.tabs, i.cta])).toEqual([
      ['Board', ['Kanban', 'Daftar'], '+ Task'],
      ['Task Saya', ['Ditugaskan', 'Diikuti'], '+ Task'],
      ['Timesheet', ['Minggu Ini', 'Riwayat'], null],
      ['Lampiran Saya', ['Semua File'], null],
    ])
  })

  it('Task Saya mengikuti project aktif; tanpa project SEGERA', () => {
    expect(editorNavItems(WS, 'p1')[1].to).toBe('/workspaces/w1/projects/p1/my-tasks')
    expect(editorNavItems(WS, null)[1].to).toBeNull()
  })

  it('Board mengikuti project aktif; tanpa project jatuh ke redirect Board', () => {
    expect(editorNavItems(WS, 'p1')[0].to).toBe('/workspaces/w1/projects/p1/board')
    expect(editorNavItems(WS, null)[0].to).toBe('/workspaces/w1/board')
  })
})

describe('isEditorPath', () => {
  it.each([
    '/workspaces/w1/board',
    '/workspaces/w1/projects/p9/board',
    '/workspaces/w1/projects/p9/my-tasks',
    '/workspaces/w1/my-timesheet',
    '/workspaces/w1/my-attachments',
    '/workspaces/w1/account',
  ])('mengizinkan %s', (path) => expect(isEditorPath(path, WS)).toBe(true))

  it.each([
    '/workspaces/w1/projects',
    '/workspaces/w1/projects/p9/sprints',
    '/workspaces/w1/my-tasks',
    '/workspaces/w1/projects/p9/members',
    '/workspaces/w1/projects/p9/rules',
    '/workspaces/w1/projects/p9/import',
    '/workspaces/w1/projects/p9/timesheet',
    '/workspaces/w1/members',
    '/workspaces/w1/performance',
    '/workspaces/w1/audit-trail',
  ])('mengalihkan %s', (path) => expect(isEditorPath(path, WS)).toBe(false))
})

// Regresi: nav PM dan AW tidak berubah oleh penambahan nav Editor.
describe('nav PM/AW tetap', () => {
  it('PM 11 item, urutan dan label tidak berubah', () => {
    expect(pmNavItems(WS, 'p1').map((i) => i.key)).toEqual([
      'kinerja', 'sprint', 'pmmembers', 'board', 'status', 'picgroup', 'rule', 'import', 'docs', 'analytics', 'audit',
    ])
  })

  it('AW 9 item, 6 di antaranya admin-only', () => {
    const items = awNavItems(WS)
    expect(items.map((i) => i.key)).toEqual(['kinerja', 'project', 'members', 'cooldown', 'status', 'rule', 'webhook', 'docs', 'audit'])
    expect(items.filter((i) => i.adminOnly)).toHaveLength(6)
  })
})

describe('approverNavItems', () => {
  it('punya 3 menu sesuai desain Master UI User (tab, tanpa CTA)', () => {
    expect(approverNavItems(WS, 'p1').map((i) => [i.label, i.tabs, i.cta])).toEqual([
      ['Antrean Approval', ['Menunggu Saya', 'Sudah Diputuskan'], null],
      ['Board', ['Kanban', 'Daftar'], null],
      ['Task Saya', ['Ditugaskan', 'Diikuti'], null],
    ])
  })

  it('mengikuti project aktif; tanpa project Antrean/Board ke redirect workspace, Task Saya SEGERA', () => {
    expect(approverNavItems(WS, 'p1').map((i) => i.to)).toEqual([
      '/workspaces/w1/projects/p1/approvals',
      '/workspaces/w1/projects/p1/board',
      '/workspaces/w1/projects/p1/my-tasks',
    ])
    expect(approverNavItems(WS, null).map((i) => i.to)).toEqual(['/workspaces/w1/approvals', '/workspaces/w1/board', null])
  })
})

describe('isApproverPath', () => {
  it.each([
    '/workspaces/w1/approvals',
    '/workspaces/w1/board',
    '/workspaces/w1/account',
    '/workspaces/w1/projects/p9/approvals',
    '/workspaces/w1/projects/p9/board',
    '/workspaces/w1/projects/p9/my-tasks',
  ])('mengizinkan %s', (path) => expect(isApproverPath(path, WS)).toBe(true))

  it.each([
    '/workspaces/w1/projects',
    '/workspaces/w1/my-timesheet',
    '/workspaces/w1/my-attachments',
    '/workspaces/w1/projects/p9/sprints',
    '/workspaces/w1/projects/p9/members',
    '/workspaces/w1/projects/p9/timesheet',
    '/workspaces/w1/members',
    '/workspaces/w1/performance',
  ])('mengalihkan %s', (path) => expect(isApproverPath(path, WS)).toBe(false))
})
