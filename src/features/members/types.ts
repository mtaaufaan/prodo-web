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
  executive_title: string
  workspace_roles: MemberWorkspaceRole[]
}

// PendingGroupMember -- satu baris undangan pending. is_executive true ->
// workspace_id/workspace_name/org_name/role kosong (undangan Eksekutif
// murni, tanpa target workspace).
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
}

export interface GroupMemberDirectory {
  members: GroupMember[]
  pending: PendingGroupMember[]
}
