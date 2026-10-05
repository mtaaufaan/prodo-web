import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { taskKeys } from '@/features/tasks/hooks'

import { executeProjectImport, getProjectImportHistory, validateProjectImport } from './api'
import type { ProjectImportKind } from './types'

export const projectImportKeys = {
  history: (projectId: string) => ['project-import', 'history', projectId] as const,
}

// staleTime 0 -- riwayat harus selalu segar setelah eksekusi (pelajaran IG-29).
export function useProjectImportHistory(projectId: string) {
  return useQuery({
    queryKey: projectImportKeys.history(projectId),
    queryFn: () => getProjectImportHistory(projectId),
    enabled: projectId !== '',
    staleTime: 0,
  })
}

export function useValidateProjectImport(projectId: string) {
  return useMutation({
    mutationFn: ({ kind, file }: { kind: ProjectImportKind; file: File }) => validateProjectImport(projectId, kind, file),
  })
}

// Eksekusi sprint mengubah daftar sprint -> invalidasi query sprint project juga.
export function useExecuteProjectImport(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (importId: string) => executeProjectImport(projectId, importId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectImportKeys.history(projectId) })
      void queryClient.invalidateQueries({ queryKey: taskKeys.sprints(projectId) })
    },
  })
}
