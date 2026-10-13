import { useParams } from 'react-router-dom'

import AuditTrailView from '@/components/audit/AuditTrailView'

// AwAuditTrailPage (S4W-16/17, US-058) -- Audit Trail Workspace untuk Admin
// Workspace. Isi di AuditTrailView (dipakai bersama Audit Trail PM, IG-130).
export default function AwAuditTrailPage() {
  const { wsId } = useParams<{ wsId: string }>()
  return <AuditTrailView scope={{ kind: 'workspace', workspaceId: wsId ?? '' }} />
}
