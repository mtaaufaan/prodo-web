import type { CustomStatus } from '@/features/tasks/types'

import type { PicGroupMember } from './types'

export type PicGroupMode = 'TERBATAS' | 'FULL'

export interface PicGroupRow {
  statusId: string
  name: string
  colorToken: string | null
  isUndefined: boolean
  members: { userId: string; name: string }[]
  mode: PicGroupMode
}

// buildRows -- satu baris per status project (urut posisi), anggota digabung
// dari baris (status, member) backend. Ada anggota = TERBATAS, kosong = FULL.
export function buildRows(statuses: CustomStatus[], groups: PicGroupMember[]): PicGroupRow[] {
  const byStatus = new Map<string, PicGroupMember[]>()
  for (const g of groups) {
    const list = byStatus.get(g.status_id)
    if (list) list.push(g)
    else byStatus.set(g.status_id, [g])
  }
  // Status require_pic=false (DONE/CANCELED default) tidak punya PIC fase -> tidak ada PIC Group.
  return statuses
    .filter((s) => s.require_pic !== false)
    .sort((a, b) => a.position - b.position)
    .map((s) => {
      const members = (byStatus.get(s.id) ?? []).map((g) => ({ userId: g.user_id, name: g.user_name || g.user_email }))
      return {
        statusId: s.id,
        name: s.name,
        colorToken: s.color_token,
        isUndefined: s.is_undefined,
        members,
        mode: members.length > 0 ? 'TERBATAS' : 'FULL',
      }
    })
}

export type PicGroupModeFilter = 'Semua' | 'Terbatas' | 'Full'

export function filterRows(rows: PicGroupRow[], mode: PicGroupModeFilter, memberId: string): PicGroupRow[] {
  return rows.filter(
    (r) =>
      (mode === 'Semua' || r.mode === mode.toUpperCase()) &&
      (memberId === 'Semua' || r.members.some((m) => m.userId === memberId)),
  )
}

// pageWindow -- sampai 5 nomor halaman di sekitar halaman aktif ("PM PIC
// Group.dc.html": jendela lo..hi, digeser supaya tetap 5 kalau memungkinkan).
export function pageWindow(page: number, totalPages: number): number[] {
  let lo = Math.max(1, page - 2)
  let hi = Math.min(totalPages, page + 2)
  if (hi - lo < 4) {
    lo = Math.max(1, hi - 4)
    hi = Math.min(totalPages, lo + 4)
  }
  const out: number[] = []
  for (let p = lo; p <= hi; p++) out.push(p)
  return out
}
