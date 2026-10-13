import { useParams } from 'react-router-dom'

import AuditTrailView from '@/components/audit/AuditTrailView'

// Menu "Audit Trail" PM (IG-130) -- aktivitas project aktif switcher; isi di
// AuditTrailView (cakupan 'project'), komponen yang sama dengan Audit Trail AW.
export default function ProjectAuditTrailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  return <AuditTrailView scope={{ kind: 'project', projectId: projectId ?? '' }} />
}
