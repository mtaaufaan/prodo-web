import { Route, Routes } from 'react-router-dom'

import AuthGuard from '@/components/AuthGuard'
import Activate from '@/pages/Activate'
import ActivateMfaSetup from '@/pages/ActivateMfaSetup'
import DesignPage from '@/pages/DesignPage'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import PlatformGroupAdminPage from '@/pages/PlatformGroupAdminPage'
import SessionsPage from '@/pages/SessionsPage'
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

      <Route element={<AuthGuard />}>
        {/* S1-22/25: "/" dulu unconditional redirect ke /login, sekarang
            landing placeholder (dashboard sungguhan belum dibangun) --
            AuthGuard yang menangani redirect ke /login kalau belum ada
            sesi, jadi tidak perlu Navigate eksplisit lagi di sini. */}
        <Route path="/" element={<Home />} />
        {/* TODO S1: /dashboard, /tasks, /projects */}
        <Route path="/settings/sessions" element={<SessionsPage />} />{/* S1-31 */}
        <Route path="/workspaces/:wsId/members" element={<WorkspaceMembersPage />} />{/* S2-07/08 */}
        {/* S1-12: AuthGuard baru cek token ada/tidak, BELUM cek role --
            RBAC platform_admin akan diperkuat saat S1-16 (JWT decode di FE)
            benar-benar diimplementasikan. */}
        <Route path="/platform/group-admins" element={<PlatformGroupAdminPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
