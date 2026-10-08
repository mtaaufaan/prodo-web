import { useParams } from 'react-router-dom'

import DocumentsView from '@/components/documents/DocumentsView'

// Menu "Dokumen & Lampiran" PM (IG-123) -- lampiran milik project aktif
// switcher; isi di DocumentsView (cakupan 'project').
export default function ProjectDocumentsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  return <DocumentsView scope={{ kind: 'project', projectId: projectId ?? '' }} />
}
