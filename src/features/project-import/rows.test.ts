import { describe, expect, it } from 'vitest'

import { importRowView, sprintRowNote, sprintRowTitle, taskRowNote, taskRowTitle } from './rows'
import type { SprintImportRow, TaskImportRow } from './types'

const base: SprintImportRow = { row: 2, code: 'SPR-01', name: 'Sprint 1', sprint_status: 'done', status: 'valid' }

describe('sprintRowNote', () => {
  it('baris valid: status + rentang tanggal', () => {
    expect(sprintRowNote({ ...base, start_date: '2026-10-01', end_date: '2026-10-14' })).toBe('STATUS DONE · 01/10/2026 → 14/10/2026')
  })
  it('baris valid tanpa tanggal: hanya status', () => {
    expect(sprintRowNote(base)).toBe('STATUS DONE')
  })
  it('baris dilewati: alasan', () => {
    expect(sprintRowNote({ ...base, status: 'skipped', reason: 'Code sudah dipakai' })).toBe('Code sudah dipakai')
  })
})

describe('sprintRowTitle', () => {
  it('valid: kode · nama', () => {
    expect(sprintRowTitle(base)).toBe('SPR-01 · Sprint 1')
  })
  it('dilewati: menyebut nomor baris', () => {
    expect(sprintRowTitle({ ...base, row: 14, code: '', name: '', status: 'skipped' })).toBe('Baris 14 — (kosong)')
    expect(sprintRowTitle({ ...base, row: 5, name: '', status: 'skipped' })).toBe('Baris 5 — SPR-01')
  })
})

const task: TaskImportRow = { row: 3, title: 'Perbaiki form', task_status: 'IN PROGRESS', priority: 'high', status: 'valid' }

describe('taskRowNote', () => {
  it('baris valid: status · priority · due · sprint · assignee', () => {
    expect(taskRowNote({ ...task, due_date: '2026-10-08', sprint: 'SPR-01', assignee: 'a@x.com;b@x.com' })).toBe(
      'STATUS IN PROGRESS · HIGH · DUE 08/10/2026 · SPR-01 · a@x.com, b@x.com',
    )
  })
  it('tanpa assignee/due/sprint', () => {
    expect(taskRowNote(task)).toBe('STATUS IN PROGRESS · HIGH · tanpa assignee')
  })
  it('dilewati: alasan', () => {
    expect(taskRowNote({ ...task, status: 'skipped', reason: 'Status tidak ada' })).toBe('Status tidak ada')
  })
})

describe('taskRowTitle / importRowView', () => {
  it('judul valid apa adanya, dilewati dengan nomor baris', () => {
    expect(taskRowTitle(task)).toBe('Perbaiki form')
    expect(taskRowTitle({ ...task, status: 'skipped' })).toBe('Baris 3 — Perbaiki form')
    expect(taskRowTitle({ ...task, title: '', status: 'skipped' })).toBe('Baris 3 — (judul kosong)')
  })
  it('importRowView memilih tampilan sesuai jenis baris', () => {
    expect(importRowView(task).title).toBe('Perbaiki form')
    expect(importRowView({ row: 2, code: 'SPR-01', name: 'Sprint 1', sprint_status: 'done', status: 'valid' }).title).toBe('SPR-01 · Sprint 1')
  })
})
