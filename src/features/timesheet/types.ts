import type { TimeEntry } from '@/features/tasks/types'

// Timesheet & Analitik PM (IG-128, desain "PM Timesheet.dc.html"). Jam tercatat
// = hanya entri disetujui (timer otomatis disetujui + manual yang di-approve).

export interface TimesheetStatusBar {
  name: string
  color_token: string
  is_undefined: boolean
  hours: number
  task_count: number
}

export interface TimesheetTaskRow {
  task_code: string
  title: string
  status_name: string
  estimated_hours: number
  logged_hours: number
}

export interface TimesheetMemberRow {
  user_id: string
  user_name: string
  role: string
  task_count: number
  hours: number
  active_count: number
}

export interface ProjectTimesheet {
  project_name: string
  logged_hours: number
  estimate_hours: number
  over_count: number
  over_codes: string[]
  members_involved: number
  pending_count: number
  by_status: TimesheetStatusBar[]
  tasks: TimesheetTaskRow[]
  members: TimesheetMemberRow[]
}

export type ApprovalFilter = 'pending' | 'approved' | 'rejected'

export interface ManualEntryRow extends TimeEntry {
  task_code: string
  task_title: string
}

export interface MyTimesheetEntry extends ManualEntryRow {
  project: { project_id: string; name: string }
}

export interface MyTimesheet {
  items: MyTimesheetEntry[]
  total: number
  approved_minutes: number
  pending_minutes: number
}

export type Tone = 'mint' | 'amber' | 'destructive' | 'blue' | 'violet' | 'bone' | 'dim'
