import { Navigate, Outlet } from 'react-router-dom'

import { useAuthStore } from '@/store/useAuthStore'

// S1-25: baca token dari useAuthStore secara reaktif (bukan localStorage
// mentah seperti placeholder S0-28) -- kalau interceptor axios membersihkan
// sesi (401, lihat src/lib/api.ts), komponen ini re-render dan langsung
// redirect tanpa perlu reload manual. Masih belum cek role (RBAC per
// halaman) -- itu dikerjakan terpisah saat routing per-role dibutuhkan.
export default function AuthGuard() {
  const hasToken = useAuthStore((state) => Boolean(state.accessToken))
  // wasPlatformAdmin bertahan lewat clearSession (lihat useAuthStore) supaya
  // sesi PA yang berakhir sendiri (idle/expired) kembali ke /platform/login,
  // bukan /login umum.
  const wasPlatformAdmin = useAuthStore((state) => state.wasPlatformAdmin)

  if (!hasToken) {
    return <Navigate to={wasPlatformAdmin ? '/platform/login' : '/login'} replace />
  }

  return <Outlet />
}
