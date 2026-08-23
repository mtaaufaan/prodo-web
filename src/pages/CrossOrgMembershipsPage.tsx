import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCrossOrgMemberships } from '@/features/cross-org-memberships/hooks'

// S3-28, US-009c (implementation_gaps.md IG-17, resolved S3 H9). Versi
// minimal: tabel keanggotaan lintas organisasi dalam satu grup + filter
// org, dibuka lewat groupId di URL langsung -- belum ada "halaman GA
// dashboard" untuk menaunginya seperti wording task asli (dashboard GA
// sendiri belum dibangun sampai sprint manapun). Konsumsi
// GET /groups/:groupId/cross-org-memberships yang sudah ada sejak S3-25/27.
function CrossOrgMembershipsPageContent() {
  const { groupId } = useParams<{ groupId: string }>()
  const id = groupId ?? ''
  const [orgFilter, setOrgFilter] = useState('')
  const { data, isLoading, isError } = useCrossOrgMemberships(id, orgFilter)

  return (
    <div className="min-h-screen bg-bg-deep">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <h1 className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
          Keanggotaan Lintas Organisasi
        </h1>

        <div className="max-w-xs space-y-2">
          <Label htmlFor="org-filter">Filter Organisasi (UUID, opsional)</Label>
          <Input id="org-filter" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} placeholder="Semua organisasi dalam grup" />
        </div>

        {isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
        {isError && <p className="text-sm text-destructive">Gagal memuat data.</p>}

        {data && (
          <Card className="border-line bg-transparent shadow-none">
            <CardHeader className="border-b border-line pb-3">
              <CardTitle className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                <div className="grid grid-cols-[1.6fr_1.2fr_1.2fr_0.8fr] gap-3">
                  <span>Member</span>
                  <span>Organisasi</span>
                  <span>Project</span>
                  <span>Role</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.length === 0 && (
                <p className="p-4 text-sm text-text-muted">Belum ada keanggotaan lintas organisasi dalam grup ini.</p>
              )}
              {data.map((m) => (
                <div
                  key={`${m.user_id}-${m.project_id}`}
                  className="grid grid-cols-[1.6fr_1.2fr_1.2fr_0.8fr] items-center gap-3 border-t border-line px-4 py-3"
                >
                  <div>
                    <div className="text-[13px] text-text-body">{m.display_name || m.email}</div>
                    <div className="mt-1 font-mono text-[8.5px] text-text-muted">{m.email}</div>
                  </div>
                  <span className="font-mono text-[11px] text-text-body">{m.org_name}</span>
                  <span className="font-mono text-[11px] text-text-body">{m.project_name}</span>
                  <span className="w-fit border border-line-strong px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-text-body">
                    {m.role}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function CrossOrgMembershipsPage() {
  return (
    <ErrorBoundary>
      <CrossOrgMembershipsPageContent />
    </ErrorBoundary>
  )
}
