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
  task_status: string
  priority: string
  assignee?: string
  start_date?: string
  due_date?: string
  sprint?: string
  estimate?: string
  story_points?: string
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
