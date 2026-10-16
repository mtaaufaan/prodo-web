import { formatDateDMY } from '@/lib/date'

import { COMMENT_MAX, type MyTask } from './types'

// Fungsi murni halaman Task Saya (port logika "TM Task Saya.dc.html" /
// "TM Komentar.dc.html").

export type MyTaskTab = 'Ditugaskan' | 'Diikuti'

export function tabRows(rows: MyTask[], tab: MyTaskTab): MyTask[] {
  return tab === 'Diikuti' ? rows.filter((t) => t.is_followed) : rows.filter((t) => t.is_mine)
}

export interface MyTaskStats {
  total: number
  running: number
  loggedHours: number
  late: number
}

// Kartu dihitung dari task "saya" (Ditugaskan), bukan dari tab yang sedang dibuka.
export function computeStats(rows: MyTask[]): MyTaskStats {
  const mine = rows.filter((t) => t.is_mine)
  return {
    total: mine.length,
    running: mine.filter((t) => t.status_name !== 'DONE' && t.status_name !== 'BACKLOG').length,
    loggedHours: mine.reduce((sum, t) => sum + t.logged_hours, 0),
    late: mine.filter((t) => t.is_late).length,
  }
}

export function metaLine(t: MyTask): string {
  const sprint = t.sprint_name ? `SPRINT ${t.sprint_name.replace(/^Sprint /i, '')}` : 'TANPA SPRINT'
  const pic = t.pic_names.length ? t.pic_names.join(', ') : '—'
  return `${sprint} · DUE ${formatDateDMY(t.due_date)} · PIC ${pic} · ${t.comment_count} KOMENTAR`
}

export function progressInfo(t: MyTask) {
  return {
    show: t.sub_total > 0 || t.estimate_hours > 0,
    label: t.sub_total ? `${t.sub_done}/${t.sub_total} SUB-TASK SELESAI` : 'TANPA SUB-TASK',
    percent: t.sub_total ? Math.round((t.sub_done / t.sub_total) * 100) : 0,
    done: t.sub_total > 0 && t.sub_done === t.sub_total,
    hours: `${t.logged_hours}J / ${t.estimate_hours}J`,
    overBudget: t.estimate_hours > 0 && t.logged_hours > t.estimate_hours,
  }
}

export function countMentions(text: string): number {
  // (?<![\w.]) -- "a@b.com" bukan mention (desain asli menghitungnya).
  return (text.match(/(?<![\w.])@[A-Za-z][\w.]*/g) ?? []).length
}

// validateComment -- minimal 2 karakter setelah trim (sama desain), maks 1000.
export function validateComment(text: string): string {
  const v = text.trim()
  if (v.length < 2) return 'Komentar tidak boleh kosong.'
  if (v.length > COMMENT_MAX) return `Komentar maksimal ${COMMENT_MAX} karakter.`
  return ''
}
