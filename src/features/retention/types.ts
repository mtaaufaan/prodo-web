// RetentionScheduleItem -- GET /groups/:id/retention-schedule (Data
// Retention, desain "GA Data Retention.dc.html" tab "Jadwal Penghapusan").
// total_days: TETAP 90 untuk kind "org" (kebijakan platform, retensi
// nonaktif organisasi -- tidak bisa diubah GA), organizations.retention_days
// pemilik untuk "workspace"/"project" (BISA diubah lewat Atur Kebijakan).
export interface RetentionScheduleItem {
  kind: 'org' | 'workspace' | 'project'
  item_id: string
  item_name: string
  org_name: string
  event_at: string
  total_days: number
  purge_at: string
  days_left: number
}
