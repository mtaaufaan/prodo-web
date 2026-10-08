import { useParams } from 'react-router-dom'

import DocumentsView from '@/components/documents/DocumentsView'

// Halaman "AW Documents" (workspace-wide, AW-only) -- isi di DocumentsView.
export default function AwDocumentsPage() {
  const { wsId } = useParams<{ wsId: string }>()
  return <DocumentsView scope={{ kind: 'workspace', workspaceId: wsId ?? '' }} />
}
