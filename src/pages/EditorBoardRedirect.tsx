import { Navigate, useParams } from 'react-router-dom'

import { useProjects } from '@/features/projects/hooks'

// /workspaces/:wsId/board -- landing Editor dan tujuan redirect rute non-Editor:
// meneruskan ke Board project pertama yang tersedia.
export default function EditorBoardRedirect() {
  const { wsId = '' } = useParams<{ wsId: string }>()
  const projects = useProjects(wsId)
  const first = (projects.data ?? []).find((p) => !p.is_archived)
  if (first) return <Navigate to={`/workspaces/${wsId}/projects/${first.id}/board`} replace />
  return (
    <div className="p-8 font-mono text-[11px] text-text-muted">
      {projects.isLoading ? 'Memuat...' : 'Belum ada project yang dapat Anda buka. Hubungi Project Manager atau Admin Workspace.'}
    </div>
  )
}
