import { useMemo, useState } from 'react'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useGroups } from '@/features/platform-admin/hooks'
import type { GroupDirectoryEntry } from '@/features/platform-admin/types'
import { useOrganizationList } from '@/features/organizations/hooks'

// GroupDirectoryPage -- S4P-35, US-083. Tidak ada mockup desain untuk
// layar ini -- "Platform Admin Console.dc.html" cuma 4 tab asli (Group
// Admin/Tier/Erasure/Audit, lihat implementation_gaps.md IG-16 dan
// catatan s4-kickoff.html) -- dibangun mengikuti bahasa visual konsol PA
// existing (PlatformAuditLogPage/PlatformGroupAdminPage: border-pa-border,
// bg-pa-header, font-mono uppercase label).
function GroupDirectoryPageContent() {
  const [query, setQuery] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const groups = useGroups(query)
  const orgs = useOrganizationList()

  const orgsInSelectedGroup = useMemo(
    () => orgs.data?.organizations.filter((o) => o.group_id === selectedGroupId) ?? [],
    [orgs.data, selectedGroupId],
  )
  const selectedGroup = groups.data?.find((g) => g.id === selectedGroupId)

  return (
    <div className="space-y-3.5 p-6">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Direktori Grup</div>
        <div className="mt-1.5 text-base font-bold">{groups.data?.length ?? 0} grup ditampilkan</div>
      </div>

      <input
        type="text"
        placeholder="Cari nama grup atau nama Group Admin..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-9 w-full max-w-sm rounded-none border border-line bg-input-bg px-2.5 py-2 font-mono text-[12.5px] text-text-body focus-visible:border-signal focus-visible:outline-none"
      />

      {groups.isLoading && <p className="font-mono text-sm text-text-muted">Memuat...</p>}
      {groups.isError && <p className="font-mono text-sm text-destructive">Gagal memuat direktori grup.</p>}

      {groups.data && (
        <div className="overflow-x-auto border border-pa-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-pa-header text-left">
                {['Nama Grup', 'Tier', 'Group Admin', 'Jml. Organisasi'].map((h) => (
                  <th key={h} className="py-2.5 pl-3.5 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.data.map((g: GroupDirectoryEntry) => (
                <tr
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id === selectedGroupId ? null : g.id)}
                  className={`cursor-pointer border-b border-line last:border-0 ${g.id === selectedGroupId ? 'bg-pa-step-active' : ''}`}
                >
                  <td className="py-2.5 pl-3.5 pr-4 text-[13px] text-text-body">{g.name}</td>
                  <td className="py-2.5 pr-4 font-mono text-[10.5px] uppercase text-text-muted">{g.tier}</td>
                  <td className="py-2.5 pr-4 font-mono text-[11px] text-text-muted">{g.ga_names || '—'}</td>
                  <td className="py-2.5 pr-4 font-mono text-[11px] text-text-muted">{g.org_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {groups.data.length === 0 && <p className="p-4 font-mono text-[11px] text-text-muted">Tidak ada grup yang cocok.</p>}
        </div>
      )}

      {selectedGroup && (
        <div className="border border-pa-border p-3.5">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
            Organisasi dalam {selectedGroup.name}
          </div>
          {orgs.isLoading && <p className="font-mono text-[11px] text-text-muted">Memuat...</p>}
          {orgsInSelectedGroup.length === 0 && !orgs.isLoading && (
            <p className="font-mono text-[11px] text-text-muted">Belum ada organisasi dalam grup ini.</p>
          )}
          <ul className="space-y-1.5">
            {orgsInSelectedGroup.map((o) => (
              <li key={o.id} className="flex items-center justify-between font-mono text-[11.5px]">
                <span className="text-text-body">{o.name}</span>
                <span className="text-text-dim">{o.slug}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function GroupDirectoryPage() {
  return (
    <ErrorBoundary>
      <GroupDirectoryPageContent />
    </ErrorBoundary>
  )
}
