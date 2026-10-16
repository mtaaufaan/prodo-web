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

function project(id: string, name: string, code: string, allowEditorSP = false): Project {
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
    allow_editor_story_points: allowEditorSP,
  }
}

export const mockProjects: Project[] = [project(PROJ_A, 'QuestLog', 'QST'), project(PROJ_B, 'PRODO', 'PRD', true)]

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

// Task Board QuestLog (S6E-05): QST-001..012 milik Eka (assignee + PIC aktif) -- sama dengan Task Saya
// (myTasksStore.ts, id `${project}-mt-${n}` supaya status/komentar sinkron) -- plus 4 task milik orang
// lain yang terkunci untuk Editor. BERSTATE: moveStatus/setCompleteness mengubah objek ini.
interface BoardSeed {
  n: number
  title: string
  status: string
  priority: Task['priority']
  owner: 'me' | 'budi' | 'citra' | null
  completeness?: 'incomplete'
  due: string
}

const OWNERS = {
  me: { user_id: MOCK_EDITOR.id, display_name: MOCK_EDITOR.display_name, email: MOCK_EDITOR.email },
  budi: { user_id: 'mock-budi', display_name: 'Budi', email: 'budi@prodo.local' },
  citra: { user_id: 'mock-citra', display_name: 'Citra', email: 'citra@prodo.local' },
}

function boardTask(s: BoardSeed): Task {
  const st = mockStatuses.find((x) => x.name === s.status) ?? mockStatuses[0]
  const owner = s.owner ? OWNERS[s.owner] : null
  return {
    id: `${PROJ_A}-mt-${s.n}`,
    project_id: PROJ_A,
    sprint_id: 'mock-sprint-1',
    sprint_name: 'Sprint 1',
    parent_task_id: null,
    status_id: st.id,
    status_name: st.name,
    status_color: st.color_token,
    title: s.title,
    description: null,
    priority: s.priority,
    completeness: st.name === 'BACKLOG' ? (s.completeness ?? 'complete') : null,
    start_date: '2026-10-05',
    due_date: s.due,
    estimated_hours: 8,
    story_points: 3,
    task_code: `QST-${String(s.n).padStart(3, '0')}`,
    created_by: 'mock-pm-id',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-10T00:00:00Z',
    completed_at: null,
    is_blocked: false,
    regression_count: 0,
    position: s.n,
    assignees: owner ? [{ ...owner, role: 'lead' as const }] : [],
    active_pics: owner
      ? [{ id: `pic-${s.n}`, task_id: `${PROJ_A}-mt-${s.n}`, status_id: st.id, status_name: st.name, user_id: owner.user_id, user_name: owner.display_name,
          user_email: owner.email, is_active: true, acknowledged_at: null, activated_at: '2026-10-05T00:00:00Z', deactivated_at: null, assigned_by: null }]
      : [],
  }
}

const SEEDS: BoardSeed[] = [
  { n: 1, title: 'Rancang layar login', status: 'BACKLOG', priority: 'medium', owner: 'me', completeness: 'incomplete', due: '2026-10-30' },
  { n: 2, title: 'Implementasi daftar quest', status: 'IN PROGRESS', priority: 'high', owner: 'me', due: '2026-10-16' },
  { n: 3, title: 'Perbaiki bug sinkronisasi', status: 'IN PROGRESS', priority: 'critical', owner: 'me', due: '2026-10-10' },
  { n: 4, title: 'Review desain profil', status: 'UNDER REVIEW', priority: 'low', owner: 'citra', due: '2026-10-20' },
  { n: 5, title: 'Rilis build internal', status: 'DONE', priority: 'medium', owner: 'me', due: '2026-10-05' },
  { n: 6, title: 'Susun dokumentasi API', status: 'IN PROGRESS', priority: 'medium', owner: 'me', due: '2026-11-02' },
  { n: 7, title: 'Optimasi query leaderboard', status: 'BACKLOG', priority: 'high', owner: 'me', due: '2026-11-10' },
  { n: 8, title: 'Uji beban server', status: 'UNDER REVIEW', priority: 'high', owner: 'me', due: '2026-10-12' },
  { n: 9, title: 'Migrasi aset gambar', status: 'IN PROGRESS', priority: 'low', owner: 'me', due: '2026-11-15' },
  { n: 10, title: 'Audit aksesibilitas', status: 'BACKLOG', priority: 'medium', owner: 'me', due: '2026-11-20' },
  { n: 11, title: 'Notifikasi push', status: 'IN PROGRESS', priority: 'high', owner: 'me', due: '2026-11-25' },
  { n: 12, title: 'Rapikan konfigurasi CI', status: 'BACKLOG', priority: 'low', owner: 'me', due: '2026-12-01' },
  { n: 13, title: 'Susun skema notifikasi', status: 'IN PROGRESS', priority: 'medium', owner: 'budi', due: '2026-10-28' },
  { n: 14, title: 'Desain ikon quest', status: 'BACKLOG', priority: 'low', owner: 'citra', completeness: 'incomplete', due: '2026-11-05' },
  { n: 15, title: 'Integrasi pembayaran sandbox', status: 'UNDER REVIEW', priority: 'high', owner: 'budi', due: '2026-10-22' },
  { n: 16, title: 'Riset kompetitor', status: 'BACKLOG', priority: 'low', owner: null, due: '2026-12-10' },
]

export const mockTasks: Task[] = SEEDS.map(boardTask)

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
