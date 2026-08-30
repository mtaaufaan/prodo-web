// S4-02/03/04, US-012.
export interface Project {
  id: string
  workspace_id: string
  name: string
  code: string
  pm_user_id: string | null
  pm_name: string
  pm_email: string
  is_archived: boolean
  member_count: number
  created_at: string
  archived_at: string | null
}
