import { Navigate, Outlet } from 'react-router-dom'

// Placeholder S0 (S0-28) -- cek keberadaan token di localStorage saja, belum
// validasi JWT/refresh sungguhan. Logic Keycloak asli (verify token, refresh,
// redirect ke OIDC login) ditambahkan di S1 saat auth flow diimplementasikan.
export default function AuthGuard() {
  const hasToken = Boolean(localStorage.getItem('prodo_access_token'))

  if (!hasToken) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
