import { Navigate, useParams } from 'react-router-dom'

import { useMyProjects } from '@/features/context/hooks'

// /workspaces/:wsId/board (Editor, S6E-01) dan /workspaces/:wsId/approvals (Approver, S7A-01) --
// landing dan tujuan redirect rute non-role: meneruskan ke halaman `page` project pertama yang
// diikuti (GET /me/projects).
export default function EditorBoardRedirect({ page = 'board' }: { page?: 'board' | 'approvals' }) {
  const { wsId = '' } = useParams<{ wsId: string }>()
  const projects = useMyProjects(wsId)
  const first = projects.data?.[0]
  if (first) return <Navigate to={`/workspaces/${wsId}/projects/${first.id}/${page}`} replace />
  return (
    <div className="p-8 font-mono text-[11px] text-text-muted">
      {projects.isLoading ? 'Memuat...' : 'Anda belum menjadi anggota project mana pun. Minta Project Manager menambahkan Anda ke project.'}
    </div>
  )
}
