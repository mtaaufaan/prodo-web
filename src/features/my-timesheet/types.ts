// Timesheet Editor (S6E-09, Sprint 6 "Editor Console"; desain "TM Timesheet.dc.html" + "TM Catat Waktu.dc.html").
// Kontrak usulan untuk backend S6E-10 (IG-140): GET /me/timesheets?workspace_id=&view=week|history&page=&per_page=
// dan POST /tasks/:id/time-log {hours, note}. Sampai S6E-10 selesai halaman memakai mock `dev:mock`.

export type TimesheetView = 'week' | 'history'

// Maks jam per pencatatan (desain: "Maksimal 12 jam per entri").
export const MAX_LOG_HOURS = 12

export interface TimesheetStats {
  // Kumulatif pada task saya (kartu "JAM TERCATAT" / "PADA TASK SAYA").
  logged_hours: number
  estimate_hours: number
  // Jumlah task dengan jam tercatat melebihi estimasi.
  over_count: number
  // Task yang belum DONE/CANCELED -- "DAPAT DICATAT".
  active_count: number
}

// Satu task milik saya (lintas project di workspace) beserta jam tercatatnya.
export interface TimesheetTask {
  task_id: string
  task_code: string
  title: string
  project_id: string
  project_name: string
  status_name: string
  estimate_hours: number | null
  // Kumulatif seluruh entri; week_hours = bagian minggu berjalan (Senin-Minggu).
  logged_hours: number
  week_hours: number
  is_active: boolean
}

export interface TimesheetEntry {
  id: string
  task_id: string
  task_code: string
  task_title: string
  project_name: string
  // YYYY-MM-DD
  entry_date: string
  hours: number
  note: string
}

export interface MyHoursTimesheet {
  stats: TimesheetStats
  tasks: TimesheetTask[]
  // Entri satu halaman (view=history); kosong untuk view=week.
  items: TimesheetEntry[]
  total: number
}

export interface LogTimeResult {
  entry_id: string
  task_code: string
  hours: number
  // Total jam tercatat task setelah entri ini.
  task_total_hours: number
}
