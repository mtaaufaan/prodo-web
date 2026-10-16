import { describe, expect, it } from 'vitest'

import { countMentions, metaLine, progressInfo, validateComment } from './myTaskStats'
import type { MyTask } from './types'

const base: MyTask = {
  task_id: 't1',
  task_code: 'QST-001',
  title: 'Judul',
  project_id: 'p1',
  status_id: 's1',
  status_name: 'IN PROGRESS',
  status_color: 'signal',
  priority: 'high',
  sprint_name: 'Sprint 1',
  due_date: '2026-10-16',
  pic_names: ['Eka', 'Budi'],
  comment_count: 2,
  sub_total: 4,
  sub_done: 1,
  logged_hours: 6,
  estimate_hours: 8,
  is_mine: true,
  is_followed: false,
  is_late: false,
  next_status: null,
}
const task = (over: Partial<MyTask>): MyTask => ({ ...base, ...over })

describe('metaLine / progressInfo', () => {
  it('baris meta sesuai desain', () => {
    expect(metaLine(base)).toBe('SPRINT 1 · DUE 16/10/2026 · PIC Eka, Budi · 2 KOMENTAR')
    expect(metaLine(task({ sprint_name: null, due_date: null, pic_names: [] }))).toBe('TANPA SPRINT · DUE — · PIC — · 2 KOMENTAR')
  })
  it('progres: sub-task, tanpa sub-task, melebihi estimasi', () => {
    expect(progressInfo(base)).toMatchObject({ show: true, label: '1/4 SUB-TASK SELESAI', percent: 25, done: false, hours: '6J / 8J', overBudget: false })
    expect(progressInfo(task({ sub_total: 0, sub_done: 0, logged_hours: 9 }))).toMatchObject({ label: 'TANPA SUB-TASK', percent: 0, overBudget: true })
    expect(progressInfo(task({ sub_total: 2, sub_done: 2 })).done).toBe(true)
    expect(progressInfo(task({ sub_total: 0, estimate_hours: 0 })).show).toBe(false)
  })
})

describe('komentar', () => {
  it('menghitung mention @nama', () => {
    expect(countMentions('halo @eka dan @budi.s, email a@b.com')).toBe(2)
    expect(countMentions('tanpa mention')).toBe(0)
  })
  it('validasi: kosong/1 karakter ditolak, 2+ karakter lolos, > 1000 ditolak', () => {
    expect(validateComment('   ')).toBe('Komentar tidak boleh kosong.')
    expect(validateComment(' a ')).toBe('Komentar tidak boleh kosong.')
    expect(validateComment('ok')).toBe('')
    expect(validateComment('x'.repeat(1001))).toContain('maksimal 1000')
  })
})
