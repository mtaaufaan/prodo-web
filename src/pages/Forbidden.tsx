import { Link } from 'react-router-dom'

import { AccessDenied } from '@/components/shared/AccessDenied'

// S2-15, US-003: halaman /403 -- tujuan redirect RoleGuard (S2-13) saat
// role user tidak memenuhi syarat route.
export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-deep">
      <AccessDenied message="Role Anda tidak memiliki izin untuk mengakses halaman ini." />
      <Link to="/" className="font-mono text-[10px] uppercase tracking-[0.06em] text-signal underline">
        Kembali ke beranda
      </Link>
    </div>
  )
}
