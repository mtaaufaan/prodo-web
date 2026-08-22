import { Navigate, Outlet } from 'react-router-dom'

import { useAuthStore } from '@/store/useAuthStore'

interface RoleGuardProps {
  allowedRoles: string[]
}

// S2-13, US-003 (implementation_gaps.md IG-02 -- route pertama yang
// ditutup: /platform/group-admins): redirect ke /403 kalau platform_role
// user tidak ada di allowedRoles. Baca dari useAuthStore (sudah ada sejak
// login), bukan re-fetch. Cuma menjangkau role PLATFORM (platform_role) --
// role WORKSPACE (admin_workspace/editor/dst) bersifat per-workspace dan
// belum ada konsep "current workspace" global di FE, jadi guard berbasis
// role workspace menyusul begitu itu ada (S3+).
export default function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const platformRole = useAuthStore((state) => state.user?.platform_role)

  if (!platformRole || !allowedRoles.includes(platformRole)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
