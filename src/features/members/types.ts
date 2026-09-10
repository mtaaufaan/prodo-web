// GroupMember/PendingGroupMember -- GET /groups/:groupId/members (Members &
// Roles, forward-pull US-086, Track S4G, desain "GA Members Roles.dc.html").
// Direktori GROUP-WIDE: lintas semua organisasi/workspace dalam satu grup.
export interface MemberWorkspaceRole {
  workspace_id: string
  workspace_name: string
  org_name: string
  role: string
}

export interface GroupMember {
  user_id: string
  email: string
  display_name: string
  is_active: boolean
  suspended: boolean
  is_group_admin: boolean
  is_executive: boolean
  title: string
  workspace_roles: MemberWorkspaceRole[]
}

// PendingGroupMember -- satu baris undangan pending. is_executive true ->
// workspace_id/workspace_name/org_name/role kosong (undangan Eksekutif
// murni, tanpa target workspace). display_name/title -- pre-filled lewat
// "Kelola" SEBELUM aktivasi (Eksekutif saja, permintaan user 2026-09-10),
// "" untuk undangan workspace biasa/yang belum diisi.
export interface PendingGroupMember {
  id: string
  email: string
  role: string
  workspace_id: string
  workspace_name: string
  org_name: string
  is_executive: boolean
  created_at: string
  expires_at: string
  display_name: string
  title: string
}

export interface GroupMemberDirectory {
  members: GroupMember[]
  pending: PendingGroupMember[]
}
