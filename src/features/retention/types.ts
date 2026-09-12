// RetentionScheduleItem -- GET /groups/:id/retention-schedule (Data
// Retention, desain "GA Data Retention.dc.html" tab "Jadwal Penghapusan").
// total_days: TETAP 90 untuk kind "org" (kebijakan platform, retensi
// nonaktif organisasi -- tidak bisa diubah GA), organizations.retention_days
// pemilik untuk "org_deleted"/"workspace"/"project" (BISA diubah lewat Atur
// Kebijakan). "org" (dinonaktifkan) dan "org_deleted" (soft-deleted,
// 2026-09-12) SENGAJA dipisah -- orthogonal, satu organisasi bisa
// dinonaktifkan SEKALIGUS dihapus, dan aksi restore-nya beda (Reactivate
// vs Restore).
export interface RetentionScheduleItem {
  kind: 'org' | 'org_deleted' | 'workspace' | 'project'
  item_id: string
  item_name: string
  org_name: string
  event_at: string
  total_days: number
  purge_at: string
  days_left: number
}
