import type { LogTimeResult, MyHoursTimesheet, TimesheetEntry, TimesheetTask, TimesheetView } from '@/features/my-timesheet/types'
import { MAX_LOG_HOURS } from '@/features/my-timesheet/types'

import { mockTasks } from './editorFixtures'
import { isOwnedByMe } from './myTasksStore'

// Data tiruan Timesheet Editor (S6E-09) -- BERSTATE di memori: mencatat jam menambah entri, total, dan bar
// sehingga halaman bisa dicoba tanpa backend. Lintas project: task QuestLog milik saya (mockTasks) + dua task
// PRODO tiruan. Aplikasi nyata memakai endpoint S6E-10; berkas ini tetap hanya untuk `dev:mock`.
const DAY_MS = 86_400_000
const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString().slice(0, 10)

interface MockTask {
  id: string
  code: string
  title: string
  project: string
  status: string
  estimate: number
}

const PRODO_TASKS: MockTask[] = [
  { id: 'mock-proj-prodo-t1', code: 'PRD-014', title: 'Rapikan halaman pengaturan', project: 'PRODO', status: 'IN PROGRESS', estimate: 12 },
  { id: 'mock-proj-prodo-t2', code: 'PRD-021', title: 'Uji regresi modul login', project: 'PRODO', status: 'UNDER REVIEW', estimate: 10 },
]

function myTasks(): MockTask[] {
  const quest = mockTasks
    .filter((t) => isOwnedByMe(t.id))
    .map((t) => ({ id: t.id, code: t.task_code ?? t.id, title: t.title, project: 'QuestLog', status: t.status_name, estimate: t.estimated_hours ?? 0 }))
  return [...quest, ...PRODO_TASKS]
}

const owns = (taskId: string) => PRODO_TASKS.some((t) => t.id === taskId) || isOwnedByMe(taskId)

let seq = 0
const entries: TimesheetEntry[] = []

function seed() {
  const tasks = myTasks()
  const pick = (code: string) => tasks.find((t) => t.code === code) ?? tasks[0]
  // [hari lalu, kode task, jam, catatan] -- tersebar di beberapa minggu supaya Riwayat berhalaman
  const rows: [number, string, number, string][] = [
    [0, 'QST-002', 2.5, 'Daftar quest: layout kartu'],
    [1, 'QST-003', 4, 'Perbaikan sinkronisasi'],
    [2, 'QST-003', 6, 'Uji ulang sinkronisasi'],
    [2, 'PRD-014', 3, ''],
    [4, 'QST-002', 3, 'Integrasi API'],
    [8, 'QST-006', 2, 'Draf dokumentasi'],
    [9, 'PRD-021', 5.5, 'Skenario login'],
    [10, 'QST-003', 1.5, ''],
    [15, 'QST-011', 2, 'Riset push notification'],
    [16, 'PRD-014', 3.5, 'Form profil'],
    [17, 'QST-008', 6, 'Skrip uji beban'],
    [18, 'QST-006', 1, ''],
    [22, 'QST-009', 3, 'Kompresi aset'],
    [23, 'PRD-021', 2.5, 'Regresi'],
  ]
  for (const [ago, code, hours, note] of rows) {
    const t = pick(code)
    entries.push({ id: `mock-te-${++seq}`, task_id: t.id, task_code: t.code, task_title: t.title, project_name: t.project, entry_date: daysAgo(ago), hours, note })
  }
}
seed()
// satu entri estimasi hasil import (IG-129) supaya badge ESTIMASI terlihat di Riwayat
entries[entries.length - 3] = { ...entries[entries.length - 3], is_estimate: true }

const weekStart = (iso: string) => {
  const t = Date.parse(`${iso}T00:00:00Z`)
  return new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * DAY_MS).toISOString().slice(0, 10)
}
const round1 = (n: number) => Math.round(n * 10) / 10

export function getMyHours(view: TimesheetView, page: number, perPage: number): MyHoursTimesheet {
  const ws = weekStart(today())
  const tasks: TimesheetTask[] = myTasks().map((t) => {
    const mine = entries.filter((e) => e.task_id === t.id)
    return {
      task_id: t.id,
      task_code: t.code,
      title: t.title,
      project_id: t.project === 'PRODO' ? 'mock-proj-prodo' : 'mock-proj-quest',
      project_name: t.project,
      status_name: t.status,
      estimate_hours: t.estimate,
      logged_hours: round1(mine.reduce((a, e) => a + e.hours, 0)),
      week_hours: round1(mine.filter((e) => e.entry_date >= ws).reduce((a, e) => a + e.hours, 0)),
      is_active: t.status !== 'DONE' && t.status !== 'CANCELED',
    }
  })
  const stats = {
    logged_hours: round1(tasks.reduce((a, t) => a + t.logged_hours, 0)),
    estimate_hours: round1(tasks.reduce((a, t) => a + (t.estimate_hours ?? 0), 0)),
    over_count: tasks.filter((t) => t.estimate_hours && t.logged_hours > t.estimate_hours).length,
    active_count: tasks.filter((t) => t.is_active).length,
  }
  const sorted = [...entries].sort((a, b) => (a.entry_date === b.entry_date ? b.id.localeCompare(a.id) : a.entry_date < b.entry_date ? 1 : -1))
  const items = view === 'history' ? sorted.slice((page - 1) * perPage, page * perPage) : []
  return { stats, tasks, items, total: sorted.length }
}

export type LogFail = 'NOT_YOUR_TASK' | 'VALIDATION_ERROR' | 'NOT_FOUND'

// logHours -- meniru gerbang backend S6E-10: task milik saya saja, 0 < jam <= 12.
export function logHours(taskId: string, hours: number, note: string): LogTimeResult | LogFail {
  const t = myTasks().find((x) => x.id === taskId)
  if (!t) return owns(taskId) ? 'NOT_FOUND' : 'NOT_YOUR_TASK'
  if (!(hours > 0) || hours > MAX_LOG_HOURS) return 'VALIDATION_ERROR'
  const e: TimesheetEntry = { id: `mock-te-${++seq}`, task_id: t.id, task_code: t.code, task_title: t.title, project_name: t.project, entry_date: today(), hours, note }
  entries.push(e)
  const total = round1(entries.filter((x) => x.task_id === t.id).reduce((a, x) => a + x.hours, 0))
  return { entry_id: e.id, task_code: t.code, hours, task_total_hours: total }
}
