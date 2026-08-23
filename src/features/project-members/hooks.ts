import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { addProjectMember, listProjectMembers, removeProjectMember, searchGroupAccounts, updateProjectMemberRole } from './api'

export const projectMemberKeys = {
  all: ['project-members'] as const,
  list: (projectId: string) => [...projectMemberKeys.all, 'list', projectId] as const,
}

const projectMembersQuery = (projectId: string) =>
  queryOptions({
    queryKey: projectMemberKeys.list(projectId),
    queryFn: () => listProjectMembers(projectId),
    enabled: projectId !== '',
  })

export function useProjectMembers(projectId: string) {
  return useQuery(projectMembersQuery(projectId))
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => addProjectMember(projectId, userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectMemberKeys.list(projectId) }),
  })
}

export function useUpdateProjectMemberRole(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => updateProjectMemberRole(projectId, userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectMemberKeys.list(projectId) }),
  })
}

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeProjectMember(projectId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectMemberKeys.list(projectId) }),
  })
}

// S3-20 search TIDAK dijadikan useQuery cache biasa -- query berubah tiap
// ketikan (autocomplete), useMutation lebih pas untuk trigger manual
// per-keystroke tanpa cache key yang terus berganti.
export function useSearchGroupAccounts() {
  return useMutation({
    mutationFn: ({ groupId, query }: { groupId: string; query: string }) => searchGroupAccounts(groupId, query),
  })
}
