// Import Data (S4G-15/16/17/18, Track S4G, desain "GA Import Data.dc.html").
// Kind CUMA "member" -- kind "task" dari desain (migrasi task dari sistem
// lama) tidak dibangun, tabel tasks belum ada (Task Management Core belum
// dibangun), dikonfirmasi user.
export interface CSVImportRow {
  row: number
  email: string
  name?: string
  role: string
  workspace: string
  workspace_id?: string
  status: 'valid' | 'existing' | 'skipped'
  reason?: string
}

export interface ValidateResult {
  import_id: string
  total_rows: number
  valid_count: number
  existing_count: number
  skipped_count: number
  preview: CSVImportRow[]
}

export interface CSVImport {
  id: string
  org_id: string
  kind: string
  filename: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  total_rows: number
  success_count: number
  failed_count: number
  row_results: CSVImportRow[]
  created_at: string
  completed_at: string | null
}
