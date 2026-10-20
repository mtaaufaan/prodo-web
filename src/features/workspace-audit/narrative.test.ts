import { describe, expect, it } from 'vitest'

import { formatWorkspaceAuditNarrative } from './narrative'
import type { WorkspaceAuditLogEntry } from './types'

function entry(action: string, target: string | null, metadata: Record<string, unknown> | null, before: Record<string, unknown> | null, after: Record<string, unknown> | null): WorkspaceAuditLogEntry {
  return {
    id: 'e1',
    actor_id: null,
    actor_email: null,
    actor_display_name: null,
    actor_role: null,
    action,
    type: 'UPDATE',
    entity_type: 'task',
    entity_id: null,
    target_name: target,
    actor_ip: null,
    request_path: null,
    state_before: before,
    state_after: after,
    metadata,
    logged_at: '2026-10-13T00:00:00Z',
  }
}

const meta = { task_code: 'PRODO-023' }

// Kalimat HARUS sama persis dengan port Go (workspace_audit_narrative_task_test.go):
// tampilan grid memakai TS ini, ekspor CSV memakai Go.
describe('narasi aksi task (IG-130, paritas dengan port Go)', () => {
  const cases: [string, WorkspaceAuditLogEntry, string][] = [
    ['dibuat dari import', entry('task.created', 'Login', meta, null, { imported: true }), 'Task PRODO-023 "Login" dibuat (hasil import)'],
    ['status', entry('task.status_changed', 'Login', meta, { status: 'BACKLOG' }, { status: 'IN PROGRESS' }), 'Status task PRODO-023 "Login" diubah dari BACKLOG menjadi IN PROGRESS'],
    ['disetujui dengan catatan', entry('task.approved', 'Login', meta, { status: 'UNDER REVIEW' }, { status: 'DONE', note: 'Sesuai kriteria.' }), 'Task PRODO-023 "Login" disetujui dan dipindahkan ke DONE (catatan: Sesuai kriteria.)'],
    ['disetujui tanpa catatan', entry('task.approved', 'Login', meta, { status: 'UNDER REVIEW' }, { status: 'DONE' }), 'Task PRODO-023 "Login" disetujui dan dipindahkan ke DONE'],
    ['ditolak dengan alasan', entry('task.rejected', 'Login', meta, { status: 'UNDER REVIEW' }, { status: 'IN PROGRESS', note: 'Uji ulang pembayaran.' }), 'Task PRODO-023 "Login" ditolak dan dikembalikan ke IN PROGRESS. Alasan: Uji ulang pembayaran.'],
    ['kelengkapan', entry('task.completeness_changed', 'Login', meta, { completeness: 'incomplete' }, { completeness: 'complete' }), 'Kelengkapan task PRODO-023 "Login" diubah dari Belum Lengkap menjadi Lengkap'],
    ['diperbarui dengan nilai sebelum', entry('task.updated', 'Baru', meta, { title: 'Lama', priority: 'low' }, { title: 'Baru', priority: 'high' }), 'Task PRODO-023 "Baru" diperbarui: judul "Lama" menjadi "Baru", prioritas low menjadi high'],
    ['diperbarui baris lama tanpa nilai sebelum', entry('task.updated', 'Baru', null, null, { title: 'Baru', priority: 'high' }), 'Task "Baru" diperbarui'],
    ['dependency', entry('task.dependency_added', 'B', meta, null, { predecessor_code: 'PRODO-001', predecessor_title: 'A' }), 'Task PRODO-023 "B" kini menunggu task PRODO-001 "A"'],
    ['komentar dibuat dengan mention', entry('comment.created', 'B', meta, null, { mentions: ['Eka', 'Budi'] }), 'Komentar ditambahkan pada task PRODO-023 "B" (mention: Eka, Budi)'],
    ['komentar dibuat tanpa mention', entry('comment.created', 'B', meta, null, { mentions: [] }), 'Komentar ditambahkan pada task PRODO-023 "B"'],
    ['komentar diedit', entry('comment.edited', 'B', meta, { text: 'lama' }, { text: 'baru' }), 'Komentar pada task PRODO-023 "B" diedit dari "lama" menjadi "baru"'],
    ['komentar dihapus', entry('comment.deleted', 'B', meta, { comment_id: 'c1' }, null), 'Komentar pada task PRODO-023 "B" dihapus'],
    ['pic ditambah', entry('task.pic_added', 'B', meta, null, { status_name: 'IN PROGRESS', user_name: 'Joyse' }), 'PIC paralel "Joyse" ditambahkan pada fase IN PROGRESS task PRODO-023 "B"'],
    ['pic diserahkan', entry('task.pic_handoff', 'B', meta, null, { status_name: 'UNDER REVIEW', from_user_names: ['Joyse', 'Amir'], to_user_name: 'Taufan' }), 'PIC fase UNDER REVIEW task PRODO-023 "B" diserahkan dari Joyse, Amir kepada "Taufan"'],
    ['lampiran diunduh', entry('attachment.downloaded', 'wireframe.pdf', null, null, null), 'Lampiran "wireframe.pdf" diunduh'],
    ['waktu dicatat langsung disetujui', entry('task.time_entry_added', 'B', meta, null, { duration_minutes: 150, approval_status: 'approved' }), 'Waktu dicatat (150 menit) pada task PRODO-023 "B", langsung disetujui'],
    ['entri manual menunggu persetujuan', entry('task.time_entry_added', 'B', meta, null, { duration_minutes: 90, approval_status: 'pending' }), 'Entri waktu manual (90 menit) ditambahkan pada task PRODO-023 "B", menunggu persetujuan'],
    ['entri waktu ditolak', entry('task.time_entry_rejected', 'B', meta, null, { rejection_note: 'durasi salah' }), 'Entri waktu task PRODO-023 "B" ditolak: durasi salah'],
    ['ekspor audit project', entry('audit.report_downloaded', 'PRODO', null, null, { scope: 'project', rows: 12 }), 'Audit Trail project "PRODO" diekspor (CSV, 12 baris)'],
    ['task lama tanpa snapshot', entry('task.deleted', null, null, null, null), 'Task "tidak diketahui" dihapus (masuk masa retensi)'],
  ]
  it.each(cases)('%s', (_name, e, want) => {
    expect(formatWorkspaceAuditNarrative(e).text).toBe(want)
  })

  it('scope kategori: TASK / PIC FASE / TIMESHEET / AUDIT TRAIL', () => {
    expect(formatWorkspaceAuditNarrative(entry('task.created', 'x', null, null, null)).scope).toBe('TASK')
    expect(formatWorkspaceAuditNarrative(entry('task.pic_added', 'x', null, null, null)).scope).toBe('PIC FASE')
    expect(formatWorkspaceAuditNarrative(entry('task.time_entry_added', 'x', null, null, null)).scope).toBe('TIMESHEET')
    expect(formatWorkspaceAuditNarrative(entry('audit.report_downloaded', 'x', null, null, null)).scope).toBe('AUDIT TRAIL')
  })
})
