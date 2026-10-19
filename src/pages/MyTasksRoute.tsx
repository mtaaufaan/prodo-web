import { useParams } from 'react-router-dom'

import { useMyContext } from '@/features/context/hooks'
import ApproverPlaceholderPage from '@/pages/ApproverPlaceholderPage'
import MyTasksPage from '@/pages/MyTasksPage'

// Rute Task Saya per project: Approver memakai kerangka sementara sampai S7A-07, role lain
// halaman Task Saya (S6E-03). Peran dicari seperti WorkspaceLayout (anggota workspace, lalu
// project-scoped).
export default function MyTasksRoute() {
  const { wsId = '' } = useParams<{ wsId: string }>()
  const ctx = useMyContext().data
  const role = ctx?.workspace_memberships.find((w) => w.workspace_id === wsId)?.role ?? ctx?.project_scoped_projects.find((p) => p.workspace_id === wsId)?.role
  if (role === 'approver') return <ApproverPlaceholderPage title="Task Saya" note="Daftar task yang ditugaskan dan diikuti Approver menyusul (S7A-07)." />
  return <MyTasksPage />
}
