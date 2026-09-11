import { useQuery } from '@tanstack/react-query'

import { getGroupSummary } from './api'

export const groupSummaryKeys = {
  all: ['group-summary'] as const,
  detail: (groupId: string) => [...groupSummaryKeys.all, groupId] as const,
}

// staleTime: 0 (override default global 60 detik di query-client.ts) --
// sama alasan useGroupAuditLogs (features/group-audit/hooks.ts): widget
// "Aktivitas Terbaru" di halaman ini membaca audit_logs yang sama, dimutasi
// dari puluhan fitur GA lain -- tanpa ini, dashboard bisa menampilkan
// aktivitas basi kalau dibuka <60 detik setelah fetch terakhir.
export function useGroupSummary(groupId: string) {
  return useQuery({
    queryKey: groupSummaryKeys.detail(groupId),
    queryFn: () => getGroupSummary(groupId),
    enabled: groupId !== '',
    staleTime: 0,
  })
}
