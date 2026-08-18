import { Navigate, Route, Routes } from 'react-router-dom'

import AuthGuard from '@/components/AuthGuard'
import DesignPage from '@/pages/DesignPage'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'

// Definisi route terpusat (S0-28). Route asli (dashboard/tasks/projects/dst)
// ditambahkan di bawah <Route element={<AuthGuard />}> mulai S1.
export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/design" element={<DesignPage />} />

      <Route element={<AuthGuard />}>
        {/* TODO S1: /dashboard, /tasks, /projects, /settings */}
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
