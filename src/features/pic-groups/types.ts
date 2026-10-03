// PicGroupMember -- satu baris (status, member) konfigurasi PIC Group project
// (GET /projects/:id/pic-groups, US-017b). Status tanpa baris = Full handoff.
export interface PicGroupMember {
  project_id: string
  status_id: string
  user_id: string
  user_name: string
  user_email: string
  added_by: string | null
  created_at: string
}
