import { Route, Routes } from 'react-router-dom'

import AuthGuard from '@/components/AuthGuard'
import RoleGuard from '@/components/RoleGuard'
import AcceptInvitationPage from '@/pages/AcceptInvitationPage'
import Activate from '@/pages/Activate'
import ActivateMfaSetup from '@/pages/ActivateMfaSetup'
import DesignPage from '@/pages/DesignPage'
import Forbidden from '@/pages/Forbidden'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import OrganizationManagementPage from '@/pages/OrganizationManagementPage'
import PlatformGroupAdminPage from '@/pages/PlatformGroupAdminPage'
import ProjectMembersPage from '@/pages/ProjectMembersPage'
import SessionsPage from '@/pages/SessionsPage'
import WorkspaceListPage from '@/pages/WorkspaceListPage'
import WorkspaceMembersPage from '@/pages/WorkspaceMembersPage'

// Definisi route terpusat (S0-28). Route asli (dashboard/tasks/projects/dst)
// ditambahkan di bawah <Route element={<AuthGuard />}> mulai S1.
export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/design" element={<DesignPage />} />
      {/* /activate & /activate/mfa-setup PUBLIC (S1-10/11) -- otorisasi lewat
          token satu-pakai di query string, bukan sesi login. */}
      <Route path="/activate" element={<Activate />} />
      <Route path="/activate/mfa-setup" element={<ActivateMfaSetup />} />
      {/* PUBLIC (S2-27, US-006) -- alur token satu-pakai sama dengan /activate,
          tapi tanpa MFA wajib (member biasa, bukan Group Admin). */}
      <Route path="/invitations/accept" element={<AcceptInvitationPage />} />

      <Route element={<AuthGuard />}>
        {/* S1-22/25: "/" dulu unconditional redirect ke /login, sekarang
            landing placeholder (dashboard sungguhan belum dibangun) --
            AuthGuard yang menangani redirect ke /login kalau belum ada
            sesi, jadi tidak perlu Navigate eksplisit lagi di sini. */}
        <Route path="/" element={<Home />} />
        {/* TODO S1: /dashboard, /tasks, /projects */}
        <Route path="/settings/sessions" element={<SessionsPage />} />{/* S1-31 */}
        <Route path="/workspaces/:wsId/members" element={<WorkspaceMembersPage />} />{/* S2-07/08 */}
        {/* S3-24, US-009b: TANPA RoleGuard platform-role -- aktor sah (AW/PM)
            platform_role-nya "member" biasa, otorisasi penuh di backend
            ProjectMemberService. */}
        <Route path="/projects/:projectId/members" element={<ProjectMembersPage />} />
        <Route path="/403" element={<Forbidden />} />{/* S2-15 */}
        {/* S2-13 (menutup implementation_gaps.md IG-02): route pertama yang
            digerbangi RoleGuard berbasis platform_role. */}
        <Route element={<RoleGuard allowedRoles={['platform_admin']} />}>
          <Route path="/platform/group-admins" element={<PlatformGroupAdminPage />} />
        </Route>
        {/* S3-07, US-007: Platform Admin (semua org) atau Group Admin (org
            dalam grup yang dia kelola, scoping lewat RLS `orgs_select`). */}
        <Route element={<RoleGuard allowedRoles={['platform_admin', 'group_admin']} />}>
          <Route path="/organizations" element={<OrganizationManagementPage />} />
          {/* S3-13, US-008: sama gate seperti /organizations -- backend
              GET .../workspaces (implementation_gaps.md IG-17) PA/GA saja,
              konsisten RLS `workspaces_delete` yang tidak punya cabang
              `admin_workspace`. */}
          <Route path="/organizations/:orgId/workspaces" element={<WorkspaceListPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
