import { describe, expect, it } from 'vitest'

import { badgeLabel, notificationHref, notificationMeta, relativeTime } from './format'
import type { AppNotification } from './types'

const NOW = Date.parse('2026-10-19T12:00:00Z')
const ago = (sec: number) => new Date(NOW - sec * 1000).toISOString()

const base: AppNotification = {
  id: 'n1', type: 'task_mention', actor_name: 'Budi', title: 't', body: null, entity_type: 'task', entity_id: 'task-1',
  project_id: 'proj-1', task_code: 'QST-001', project_name: 'QuestLog', is_read: false, created_at: ago(10),
}

describe('relativeTime', () => {
  it.each([
    [10, 'baru saja'],
    [59, 'baru saja'],
    [60, '1 menit lalu'],
    [5 * 60, '5 menit lalu'],
    [59 * 60, '59 menit lalu'],
    [60 * 60, '1 jam lalu'],
    [23 * 3600, '23 jam lalu'],
    [24 * 3600, 'kemarin'],
    [47 * 3600, 'kemarin'],
    [3 * 86400, '3 hari lalu'],
    [-120, 'baru saja'], // jam klien tertinggal dari server
  ])('%i detik yang lalu -> %s', (sec, want) => {
    expect(relativeTime(ago(sec), NOW)).toBe(want)
  })

  it('timestamp rusak -> baru saja, bukan NaN', () => {
    expect(relativeTime('bukan-tanggal', NOW)).toBe('baru saja')
  })
})

describe('notificationMeta', () => {
  it('memetakan tipe komentar, mention, penugasan, timesheet', () => {
    expect(notificationMeta('task_mention').label).toBe('MENTION')
    expect(notificationMeta('task_mention_digest').label).toBe('MENTION')
    // ◈ APPROVAL (S7A-11): hasil keputusan terbaca dari warna lencana.
    expect(notificationMeta('approval_pending')).toMatchObject({ icon: '◈', label: 'APPROVAL', tone: expect.stringContaining('violet') })
    expect(notificationMeta('task_approved')).toMatchObject({ icon: '◈', label: 'APPROVAL', tone: expect.stringContaining('mint') })
    expect(notificationMeta('task_rejected')).toMatchObject({ icon: '◈', label: 'APPROVAL', tone: expect.stringContaining('red') })
    expect(notificationMeta('task_comment').label).toBe('KOMENTAR')
    expect(notificationMeta('task_assigned').label).toBe('DITUGASKAN')
    expect(notificationMeta('pic_assigned').label).toBe('DITUGASKAN')
    expect(notificationMeta('time_entry_approved').label).toBe('TIMESHEET')
    expect(notificationMeta('timesheet_reminder').label).toBe('TIMESHEET')
  })

  it('tipe tak dikenal memakai ikon generik', () => {
    expect(notificationMeta('sesuatu_baru')).toMatchObject({ icon: '•', label: 'INFO' })
  })
})

describe('notificationHref', () => {
  it('notifikasi task membuka Board project dengan Task Detail', () => {
    expect(notificationHref(base, 'ws-1')).toBe('/workspaces/ws-1/projects/proj-1/board?task=task-1')
  })

  it('notifikasi antrean membuka Antrean Approval project itu dengan task disorot; keputusan membuka Board', () => {
    expect(notificationHref({ ...base, type: 'approval_pending' }, 'ws-1')).toBe('/workspaces/ws-1/projects/proj-1/approvals?task=task-1')
    expect(notificationHref({ ...base, type: 'task_approved' }, 'ws-1')).toBe('/workspaces/ws-1/projects/proj-1/board?task=task-1')
  })

  it('tanpa project/entitas task -> tanpa tautan (hanya ditandai dibaca)', () => {
    expect(notificationHref({ ...base, project_id: null }, 'ws-1')).toBeNull()
    expect(notificationHref({ ...base, entity_type: 'organization' }, 'ws-1')).toBeNull()
    expect(notificationHref({ ...base, entity_id: null }, 'ws-1')).toBeNull()
  })
})

describe('badgeLabel', () => {
  it('kosong untuk 0, angka apa adanya, 99+ di atas 99', () => {
    expect(badgeLabel(0)).toBe('')
    expect(badgeLabel(-1)).toBe('')
    expect(badgeLabel(3)).toBe('3')
    expect(badgeLabel(99)).toBe('99')
    expect(badgeLabel(100)).toBe('99+')
  })
})
