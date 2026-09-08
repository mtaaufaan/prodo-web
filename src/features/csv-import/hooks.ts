import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { executeImport, getImport, getImportHistory, validateMemberImport } from './api'

export const csvImportKeys = {
  all: ['csv-import'] as const,
  history: (groupId: string) => [...csvImportKeys.all, 'history', groupId] as const,
  detail: (groupId: string, importId: string) => [...csvImportKeys.all, 'detail', groupId, importId] as const,
}

export function useImportHistory(groupId: string) {
  return useQuery({
    queryKey: csvImportKeys.history(groupId),
    queryFn: () => getImportHistory(groupId),
    enabled: groupId !== '',
  })
}

// useCSVImportStatus -- polling sampai job Asynq selesai (completed/failed),
// dipakai wizard step 3 "Hasil".
export function useCSVImportStatus(groupId: string, importId: string | null) {
  return useQuery({
    queryKey: csvImportKeys.detail(groupId, importId ?? ''),
    queryFn: () => getImport(groupId, importId ?? ''),
    enabled: importId !== null,
    refetchInterval: (query) => (query.state.data?.status === 'completed' || query.state.data?.status === 'failed' ? false : 1500),
  })
}

export function useValidateMemberImport(groupId: string) {
  return useMutation({
    mutationFn: ({ orgId, file }: { orgId: string; file: File }) => validateMemberImport(groupId, orgId, file),
  })
}

export function useExecuteImport(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (importId: string) => executeImport(groupId, importId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: csvImportKeys.history(groupId) }),
  })
}
