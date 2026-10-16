import { Navigate, useParams } from 'react-router-dom'

import { useMyProjects } from '@/features/context/hooks'

// /workspaces/:wsId/board -- landing Editor dan tujuan redirect rute non-Editor:
// meneruskan ke Board project pertama yang diikuti Editor (GET /me/projects).
export default function EditorBoardRedirect() {
  const { wsId = '' } = useParams<{ wsId: string }>()
  const projects = useMyProjects(wsId)
  const first = projects.data?.[0]
  if (first) return <Navigate to={`/workspaces/${wsId}/projects/${first.id}/board`} replace />
  return (
    <div className="p-8 font-mono text-[11px] text-text-muted">
      {projects.isLoading ? 'Memuat...' : 'Anda belum menjadi anggota project mana pun. Minta Project Manager menambahkan Anda ke project.'}
    </div>
  )
}
