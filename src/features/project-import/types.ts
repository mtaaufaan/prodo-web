// Import CSV PM ("PM Import CSV.dc.html", IG-120) -- level PROJECT, dikelola
// PM / Admin Workspace. Tahap (a): kind 'sprint'; 'task' menyusul.
export type ProjectImportKind = 'sprint' | 'task'

export interface SprintImportRow {
  row: number
  code: string
  name: string
  start_date?: string
  end_date?: string
  goal?: string
  sprint_status: 'backlog' | 'active' | 'done'
  status: 'valid' | 'skipped'
  reason?: string
}

export interface TaskImportRow {
  row: number
  title: string
  description?: string
  task_status: string
  priority: string
  assignee?: string
  start_date?: string
  due_date?: string
  sprint?: string
  estimate?: string
  story_points?: string
  // riwayat tanggal status + PIC per status (tahap c, opsional)
  created_at?: string
  in_progress_at?: string
  under_review_at?: string
  done_at?: string
  pic_backlog?: string
  pic_in_progress?: string
  pic_under_review?: string
  pic_done?: string
  task_code?: string
  status: 'valid' | 'skipped'
  reason?: string
}

export interface ProjectImportValidateResult {
  import_id: string
  kind: ProjectImportKind
  total_rows: number
  valid_count: number
  skipped_count: number
  preview: (SprintImportRow | TaskImportRow)[]
}

export interface ProjectImport {
  id: string
  project_id: string
  kind: ProjectImportKind
  filename: string
  status: 'pending' | 'completed' | 'failed'
  total_rows: number
  success_count: number | null
  failed_count: number | null
  imported_by_name: string
  created_at: string
  completed_at: string | null
}
