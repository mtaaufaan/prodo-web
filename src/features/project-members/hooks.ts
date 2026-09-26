import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { projectKeys } from '@/features/projects/hooks'

import {
  addMembersBulk,
  addProjectMember,
  listProjectMemberCandidates,
  listProjectMembers,
  listProjectMembersForManagement,
  removeProjectMember,
  searchGroupAccounts,
  updateProjectMemberRole,
} from './api'

export const projectMemberKeys = {
  all: ['project-members'] as const,
  // forProject -- prefix 3-elemen (TANPA varian assignable/manage) supaya
  // invalidateQueries di bawah mengenai SEMUA mode fetch project ini
  // sekaligus (fuzzy-match TanStack Query cuma cocok kalau key yang
  // di-invalidate PERSIS prefix dari key asli -- key 4-elemen lama
  // `list(projectId)` alias `list(projectId, false)` TIDAK PERNAH
  // menjangkau varian assignable=true/'manage', bug laten yang baru
  // ketahuan sekarang karena IG-100 menambah varian ketiga).
  forProject: (projectId: string) => [...projectMemberKeys.all, 'list', projectId] as const,
  list: (projectId: string, assignable = false) => [...projectMemberKeys.all, 'list', projectId, assignable] as const,
  manage: (projectId: string) => [...projectMemberKeys.all, 'list', projectId, 'manage'] as const,
  candidates: (projectId: string) => [...projectMemberKeys.all, 'candidates', projectId] as const,
}

const projectMembersQuery = (projectId: string, assignable = false) =>
  queryOptions({
    queryKey: projectMemberKeys.list(projectId, assignable),
    queryFn: () => listProjectMembers(projectId, assignable),
    enabled: projectId !== '',
  })

// assignable=true ikut sertakan PM penanggung jawab project sebagai kandidat
// (lihat ProjectMemberRepository.ListAssignableMembers backend) -- dipakai
// picker assignee/PIC (AddTaskModal/TaskDetailModal/KanbanBoard), BUKAN
// halaman kelola member (ProjectMembersPage -- lihat useProjectMembersForManagement
// di bawah).
export function useProjectMembers(projectId: string, assignable = false) {
  return useQuery(projectMembersQuery(projectId, assignable))
}

// useProjectMembersForManagement (IG-100 susulan) -- ?view=manage: project
// member + PM + SEMUA Admin Workspace/Division Viewer workspace pemilik
// project ini. KHUSUS ProjectMembersPage.
export function useProjectMembersForManagement(projectId: string) {
  return useQuery({
    queryKey: projectMemberKeys.manage(projectId),
    queryFn: () => listProjectMembersForManagement(projectId),
    enabled: projectId !== '',
  })
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => addProjectMember(projectId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectMemberKeys.forProject(projectId) })
      // Project.member_count (ProjectListPage) berubah tiap kali baris
      // project_members bertambah/berkurang -- tidak tahu workspaceId di
      // sini (cuma projectId), jadi invalidate seluruh prefix projectKeys
      // (['projects']) alih-alih key spesifik per-workspace, tetap murah
      // (cuma me-refetch list yang sedang aktif dipakai). Sebelumnya cuma
      // projectMemberKeys yang di-invalidate, angka basi sampai reload
      // manual (audit 2026-09-13, sama pola bug admin_count yang ditemukan
      // user -- lihat implementation_gaps.md IG-69).
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useUpdateProjectMemberRole(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => updateProjectMemberRole(projectId, userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectMemberKeys.forProject(projectId) }),
  })
}

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeProjectMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectMemberKeys.forProject(projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
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

// useProjectMemberCandidates (IG-100 susulan) -- "candidate pool" modal
// Tambah Member Project, lihat listProjectMemberCandidates.
export function useProjectMemberCandidates(projectId: string) {
  return useQuery({
    queryKey: projectMemberKeys.candidates(projectId),
    queryFn: () => listProjectMemberCandidates(projectId),
    enabled: projectId !== '',
  })
}

// useAddMembersBulk (IG-100 susulan) -- pool kandidat harus ikut
// di-invalidate (pola sama useCreateInvitations workspace-members): akun
// yang baru ditambahkan/diundang harus hilang dari pool, bukan tetap
// muncul sampai reload manual.
export function useAddMembersBulk(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ emails, role }: { emails: string[]; role: string }) => addMembersBulk(projectId, emails, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectMemberKeys.forProject(projectId) })
      queryClient.invalidateQueries({ queryKey: projectMemberKeys.candidates(projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}
