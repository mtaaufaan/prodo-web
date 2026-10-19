import { useParams } from 'react-router-dom'

import DocumentsView from '@/components/documents/DocumentsView'

// Halaman "Lampiran Saya" Editor (S6E-11, "AW Documents.dc.html" mode Editor) -- isi di DocumentsView.
export default function MyAttachmentsPage() {
  const { wsId } = useParams<{ wsId: string }>()
  return <DocumentsView scope={{ kind: 'mine', workspaceId: wsId ?? '' }} />
}
