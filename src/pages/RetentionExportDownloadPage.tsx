import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { apiClient, ApiError } from '@/lib/api'

interface ExportManifest {
  kind: string
  item_name: string
  org_name: string
  requested_at: string
  note: string
}

function getExport(token: string) {
  return apiClient.get<ExportManifest>(`/api/v1/retention-exports/${token}`)
}

// RetentionExportDownloadPage -- PUBLIC (token-based, sama pola
// AcceptInvitationPage), tujuan tautan email "Ekspor Data Sebelum
// Penghapusan" (Data Retention). Manifest CUMA metadata (dikonfirmasi
// user) -- "Unduh JSON" murni client-side (Blob), tidak ada endpoint
// unduhan biner terpisah.
function RetentionExportDownloadPageContent() {
  const { token = '' } = useParams()
  const query = useQuery({
    queryKey: ['retention-export', token],
    queryFn: () => getExport(token),
    enabled: token !== '',
    retry: false,
  })

  const handleDownload = () => {
    if (!query.data) return
    const blob = new Blob([JSON.stringify(query.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `retensi-${query.data.item_name.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const notFound = query.error instanceof ApiError && query.error.code === 'NOT_FOUND'

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-deep p-6 text-text-body">
      <div className="w-full max-w-[480px] border border-line bg-panel p-6">
        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-signal">Ekspor Data Sebelum Penghapusan</div>
        {query.isLoading && <p className="mt-4 text-sm text-text-muted">Memuat...</p>}
        {notFound && (
          <p className="mt-4 text-sm text-destructive">Tautan unduhan tidak valid atau sudah kedaluwarsa (berlaku 72 jam sejak dibuat).</p>
        )}
        {query.error && !notFound && <p className="mt-4 text-sm text-destructive">Gagal memuat data ekspor.</p>}
        {query.data && (
          <>
            <div className="mt-3 text-[18px] font-bold">{query.data.item_name}</div>
            <div className="mt-1 font-mono text-[10px] text-text-muted">
              {query.data.org_name} · diminta {new Date(query.data.requested_at).toLocaleString('id-ID')}
            </div>
            <p className="mt-4 font-mono text-[10px] leading-relaxed text-text-muted">{query.data.note}</p>
            <Button onClick={handleDownload} className="mt-5 w-full font-mono text-[10px] font-bold uppercase tracking-[0.06em]">
              Unduh JSON
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function RetentionExportDownloadPage() {
  return (
    <ErrorBoundary>
      <RetentionExportDownloadPageContent />
    </ErrorBoundary>
  )
}
