import { Route, Routes } from 'react-router-dom'

import AuthGuard from '@/components/AuthGuard'
import PlatformAdminLayout from '@/components/PlatformAdminLayout'
import RoleGuard from '@/components/RoleGuard'
import AcceptInvitationPage from '@/pages/AcceptInvitationPage'
import Activate from '@/pages/Activate'
import ActivateMfaSetup from '@/pages/ActivateMfaSetup'
import CrossOrgMembershipsPage from '@/pages/CrossOrgMembershipsPage'
import DesignPage from '@/pages/DesignPage'
import ErasureRequestsPage from '@/pages/ErasureRequestsPage'
import Forbidden from '@/pages/Forbidden'
import GroupDirectoryPage from '@/pages/GroupDirectoryPage'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import OrganizationManagementPage from '@/pages/OrganizationManagementPage'
import PlatformAdminAccountsPage from '@/pages/PlatformAdminAccountsPage'
import PlatformAuditLogPage from '@/pages/PlatformAuditLogPage'
import PlatformDashboardPage from '@/pages/PlatformDashboardPage'
import PlatformGroupAdminPage from '@/pages/PlatformGroupAdminPage'
import PlatformLoginPage from '@/pages/PlatformLoginPage'
import PlatformSecuritySettingsPage from '@/pages/PlatformSecuritySettingsPage'
import PlatformTiersPage from '@/pages/PlatformTiersPage'
import ProjectListPage from '@/pages/ProjectListPage'
import ProjectMembersPage from '@/pages/ProjectMembersPage'
import SessionsPage from '@/pages/SessionsPage'
import WorkspaceListPage from '@/pages/WorkspaceListPage'
import WorkspaceMembersPage from '@/pages/WorkspaceMembersPage'
import WorkspaceLayout from '@/components/WorkspaceLayout'

// Definisi route terpusat (S0-28). Route asli (dashboard/tasks/projects/dst)
// ditambahkan di bawah <Route element={<AuthGuard />}> mulai S1.
export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* S4P-19 (implementation_gaps.md IG-20): login terpisah khusus
          Platform Admin, PUBLIC sama seperti /login -- otorisasi lewat
          credential + MFA di endpoint yang sama (/auth/login), bukan
          mekanisme baru. */}
      <Route path="/platform/login" element={<PlatformLoginPage />} />
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
        {/* WorkspaceLayout (2026-08-30, US-012): kerangka Master UI User --
            diekstrak dari desain "Master UI User.dc.html" -- dibangun
            karena 5 halaman member/workspace sudah berjalan tanpa shell
            sama sekali sebelum ini. Halaman baru tinggal disambung sebagai
            child route begitu task-nya selesai, sama pola PlatformAdminLayout. */}
        <Route element={<WorkspaceLayout />}>
          <Route path="/workspaces/:wsId/members" element={<WorkspaceMembersPage />} />{/* S2-07/08 */}
          <Route path="/workspaces/:wsId/projects" element={<ProjectListPage />} />{/* S4-04, US-012 */}
        </Route>
        {/* S3-24, US-009b: TANPA RoleGuard platform-role -- aktor sah (AW/PM)
            platform_role-nya "member" biasa, otorisasi penuh di backend
            ProjectMemberService. */}
        <Route path="/projects/:projectId/members" element={<ProjectMembersPage />} />
        <Route path="/403" element={<Forbidden />} />{/* S2-15 */}
        {/* S2-13 (menutup implementation_gaps.md IG-02): route pertama yang
            digerbangi RoleGuard berbasis platform_role. */}
        {/* PlatformAdminLayout (2026-08-24, atas permintaan user): kerangka
            konsol PA (sidebar navigasi + sign out), diekstrak dari desain
            "Platform Admin Console.dc.html" -- dibangun supaya bentuk penuh
            menu PA terlihat sejak sekarang, halaman baru tinggal disambung
            sebagai child route begitu task-nya selesai. */}
        <Route element={<RoleGuard allowedRoles={['platform_admin']} />}>
          <Route element={<PlatformAdminLayout />}>
            <Route path="/platform/group-admins" element={<PlatformGroupAdminPage />} />
            {/* S4P-11: katalog tier (assign tier ke GA ada di form Group
                Admin di atas; halaman ini untuk edit definisi tier itu
                sendiri -- lifecycle nonaktif/archive/hapus). */}
            <Route path="/platform/tiers" element={<PlatformTiersPage />} />
            {/* S4P-18, US-070: panel keamanan (session timeout global + IP allowlist self-service). */}
            <Route path="/platform/security-settings" element={<PlatformSecuritySettingsPage />} />
            {/* S4P-40, US-084: kelola akun Platform Admin lain. */}
            <Route path="/platform/admins" element={<PlatformAdminAccountsPage />} />
            {/* S4P-23, US-071: jejak audit level platform (append-only). */}
            <Route path="/platform/audit-logs" element={<PlatformAuditLogPage />} />
            {/* S4P-27, US-072: KPI, tren, dan alert anomali. */}
            <Route path="/platform/dashboard" element={<PlatformDashboardPage />} />
            {/* S4P-33, US-060: antrian Right to Erasure. */}
            <Route path="/platform/erasure-requests" element={<ErasureRequestsPage />} />
            {/* S4P-35, US-083: direktori grup (halaman konsol PA, hanya
                Platform Admin -- lihat komentar GroupDirectoryPage). */}
            <Route path="/platform/groups" element={<GroupDirectoryPage />} />
          </Route>
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
          {/* S3-28, US-009c: sama gate -- backend GET .../cross-org-memberships
              (S3-25/27) PA/GA saja. */}
          <Route path="/groups/:groupId/cross-org-memberships" element={<CrossOrgMembershipsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
