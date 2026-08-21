import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/useAuthStore'

// Placeholder landing setelah login (S1-22/25) -- dashboard sungguhan belum
// dibangun (menyusul sprint berikutnya per PRD §2.3+). Halaman ini cuma
// membuktikan sesi tersimpan benar dan menyediakan tombol logout untuk
// menguji AuthGuard redirect.
export default function Home() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-deep p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary">Selamat datang, {user?.display_name}</h1>
        <p className="mt-2 text-muted-foreground">
          Role: {user?.platform_role} -- dashboard belum tersedia, menyusul di sprint berikutnya.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link to="/settings/sessions">
            <Button variant="outline" className="font-mono text-[11px] uppercase tracking-[0.08em]">
              Sesi & Perangkat
            </Button>
          </Link>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="font-mono text-[11px] uppercase tracking-[0.08em]"
          >
            Keluar
          </Button>
        </div>
      </div>
    </div>
  )
}
