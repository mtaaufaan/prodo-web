import { apiClient } from '@/lib/api'

// bulkUpdateStorageAllocation -- PUT /groups/:groupId/storage-allocation
// (S4G-07, Track S4G, desain "GA Storage Quota.dc.html" modal "Atur
// Alokasi Kuota"). allocations: org_id -> quota_bytes, boleh parsial
// (cuma baris yang diubah user) -- org yang tidak disebut dianggap tetap.
export function bulkUpdateStorageAllocation(groupId: string, allocations: Record<string, number>) {
  return apiClient.put<{ group_id: string; allocations: Record<string, number> }>(
    `/api/v1/groups/${groupId}/storage-allocation`,
    { allocations },
  )
}
