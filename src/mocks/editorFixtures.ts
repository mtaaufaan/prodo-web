import type { Capabilities, FollowedProject, UserContext } from '@/features/context/types'
import type { ProjectMember } from '@/features/project-members/types'
import type { Project } from '@/features/projects/types'
import type { CustomStatus, Sprint, Task } from '@/features/tasks/types'
import type { Workspace } from '@/features/workspaces/types'

// Data tiruan Editor untuk `npm run dev:mock` (S6E-01) -- kerangka Master UI
// Editor bisa dilihat tanpa backend/akun Editor. Dibuang bertahap: tiap menu
// Editor melepas mock-nya di langkah backend-nya (S6E-02, 06, 09, 12, 14).
export const MOCK_EDITOR = { id: 'mock-editor-id', email: 'editor@prodo.local', display_name: 'Eka Editor', platform_role: 'none', avatar_url: null }

const WS = 'mock-ws-1'
const PROJ_A = 'mock-proj-quest'
const PROJ_B = 'mock-proj-prodo'

// Bentuk sama dengan service.CapabilitiesForRole('editor') di backend.
const editorCapabilities: Capabilities = {
  create_task: true,
  edit_own_task: true,
  comment: true,
  log_time: true,
  attach: true,
  manage_project: false,
  manage_rules: false,
  manage_members: false,
}

export const mockContext: UserContext = {
  platform_role: 'none',
  ga_console_enabled: false,
  active_context: 'workspace',
  workspace_memberships: [{ workspace_id: WS, name: 'IT - Eldwin', org_name: 'RDS', role: 'editor', capabilities: editorCapabilities, joined_at: '2026-09-01' }],
  project_scoped_projects: [],
}

export const mockWorkspace: Workspace = {
  id: WS,
  org_id: 'mock-org',
  name: 'IT - Eldwin',
  archived_at: null,
  deactivated_at: null,
  created_at: '2026-09-01T00:00:00Z',
  mention_cooldown_minutes: 10,
  mention_digest_enabled: false,
}

function project(id: string, name: string, code: string): Project {
  return {
    id,
    workspace_id: WS,
    name,
    code,
    project_managers: [{ user_id: 'mock-pm-id', name: 'Pandu PM', email: 'pm@prodo.local' }],
    pending_pm_invitations: [],
    is_archived: false,
    member_count: 4,
    sprint_count: 1,
    task_count: 5,
    created_by_name: 'Pandu PM',
    created_by_email: 'pm@prodo.local',
    created_at: '2026-09-02T00:00:00Z',
    archived_at: null,
    status: 'in_progress',
    end_date: null,
    mention_cooldown_minutes: null,
  }
}

export const mockProjects: Project[] = [project(PROJ_A, 'QuestLog', 'QST'), project(PROJ_B, 'PRODO', 'PRD')]

// GET /me/projects
export const mockFollowedProjects: FollowedProject[] = mockProjects.map((p) => ({ id: p.id, workspace_id: p.workspace_id, name: p.name, code: p.code }))

const status = (id: string, name: string, color: string, position: number): CustomStatus => ({
  id,
  name,
  color_token: color,
  position,
  is_system: true,
  is_undefined: false,
  require_start_confirmation: false,
  require_pic: name !== 'BACKLOG' && name !== 'DONE',
  task_count: 0,
})

export const mockStatuses: CustomStatus[] = [
  status('st-backlog', 'BACKLOG', 'grey', 0),
  status('st-progress', 'IN PROGRESS', 'signal', 1),
  status('st-review', 'UNDER REVIEW', 'violet', 2),
  status('st-done', 'DONE', 'mint', 3),
]

export const mockSprints: Sprint[] = [
  { id: 'mock-sprint-1', project_id: PROJ_A, code: 'SPR-01', name: 'Sprint 1', start_date: '2026-10-05', end_date: '2026-10-19', goal: null, status: 'active', created_at: '2026-10-01T00:00:00Z' },
]

function task(n: number, title: string, st: CustomStatus, priority: Task['priority'], mine: boolean): Task {
  return {
    id: `mock-task-${n}`,
    project_id: PROJ_A,
    sprint_id: 'mock-sprint-1',
    sprint_name: 'Sprint 1',
    parent_task_id: null,
    status_id: st.id,
    status_name: st.name,
    status_color: st.color_token,
    title,
    description: null,
    priority,
    completeness: 'complete',
    start_date: '2026-10-05',
    due_date: '2026-10-16',
    estimated_hours: 8,
    story_points: 3,
    task_code: `QST-${String(n).padStart(3, '0')}`,
    created_by: 'mock-pm-id',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-10T00:00:00Z',
    completed_at: null,
    is_blocked: false,
    regression_count: 0,
    position: n,
    assignees: mine ? [{ user_id: MOCK_EDITOR.id, display_name: MOCK_EDITOR.display_name, email: MOCK_EDITOR.email, role: 'lead' }] : [],
    active_pics: [],
  }
}

export const mockTasks: Task[] = [
  task(1, 'Rancang layar login', mockStatuses[0], 'medium', false),
  task(2, 'Implementasi daftar quest', mockStatuses[1], 'high', true),
  task(3, 'Perbaiki bug sinkronisasi', mockStatuses[1], 'critical', true),
  task(4, 'Review desain profil', mockStatuses[2], 'low', false),
  task(5, 'Rilis build internal', mockStatuses[3], 'medium', true),
]

// GET /projects/:id/members (picker PIC) -- bentuk ProjectMember.
const member = (id: string, name: string): ProjectMember => ({
  user_id: id,
  email: `${id}@prodo.local`,
  display_name: name,
  role: 'editor',
  is_scoped: true,
  added_at: '2026-09-02T00:00:00Z',
  workspace_role: 'editor',
  is_pending: false,
  title: null,
})
export const mockMembers: ProjectMember[] = [member('mock-editor-id', 'Eka Editor'), member('mock-budi', 'Budi'), member('mock-citra', 'Citra')]
