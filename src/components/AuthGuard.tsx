import { Navigate, Outlet } from 'react-router-dom'

import { useAuthStore } from '@/store/useAuthStore'

// S1-25: baca token dari useAuthStore secara reaktif (bukan localStorage
// mentah seperti placeholder S0-28) -- kalau interceptor axios membersihkan
// sesi (401, lihat src/lib/api.ts), komponen ini re-render dan langsung
// redirect ke /login tanpa perlu reload manual. Masih belum cek role
// (RBAC per halaman) -- itu dikerjakan terpisah saat routing per-role dibutuhkan.
export default function AuthGuard() {
  const hasToken = useAuthStore((state) => Boolean(state.accessToken))

  if (!hasToken) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
