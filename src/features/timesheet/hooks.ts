import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { approveTimeEntry, createManualTimeEntry, rejectTimeEntry, updateManualTimeEntry } from '@/features/tasks/api'
import { taskKeys } from '@/features/tasks/hooks'

import { getMyTimesheet, getProjectTimesheet, getTimesheetEntries } from './api'
import type { ApprovalFilter } from './types'

export const timesheetKeys = {
  all: ['timesheet'] as const,
  project: (projectId: string) => [...timesheetKeys.all, 'project', projectId] as const,
  entries: (projectId: string, approval: ApprovalFilter) => [...timesheetKeys.all, 'entries', projectId, approval] as const,
  mine: (from: string, to: string) => [...timesheetKeys.all, 'mine', from, to] as const,
}

// Data jam bisa berubah dari mana saja (widget timer di Task Detail, halaman
// ini) -- staleTime 0 supaya angka selalu segar saat halaman dibuka.
export function useProjectTimesheet(projectId: string, enabled = true) {
  return useQuery({
    queryKey: timesheetKeys.project(projectId),
    queryFn: () => getProjectTimesheet(projectId),
    enabled: enabled && projectId !== '',
    staleTime: 0,
  })
}

export function useTimesheetEntries(projectId: string, approval: ApprovalFilter, enabled = true) {
  return useQuery({
    queryKey: timesheetKeys.entries(projectId, approval),
    queryFn: () => getTimesheetEntries(projectId, approval),
    enabled: enabled && projectId !== '',
    staleTime: 0,
  })
}

export function useMyTimesheet(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: timesheetKeys.mine(from, to),
    queryFn: () => getMyTimesheet(from, to),
    enabled,
    staleTime: 0,
  })
}

interface EntryValues {
  started_at: string
  ended_at: string
  note?: string
}

// Semua aksi entri (tambah/ubah/setujui/tolak) menyegarkan seluruh data
// timesheet dan task (jam tercatat di header Task Detail ikut berubah).
function useRefreshAfterMutation() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: timesheetKeys.all })
    queryClient.invalidateQueries({ queryKey: taskKeys.all })
  }
}

export function useApproveEntry() {
  const refresh = useRefreshAfterMutation()
  return useMutation({ mutationFn: (entryId: string) => approveTimeEntry(entryId), onSuccess: refresh })
}

export function useRejectEntry() {
  const refresh = useRefreshAfterMutation()
  return useMutation({ mutationFn: ({ entryId, note }: { entryId: string; note: string }) => rejectTimeEntry(entryId, note), onSuccess: refresh })
}

export function useUpdateEntry() {
  const refresh = useRefreshAfterMutation()
  return useMutation({
    mutationFn: ({ entryId, values }: { entryId: string; values: EntryValues }) => updateManualTimeEntry(entryId, values),
    onSuccess: refresh,
  })
}

export function useCreateEntry() {
  const refresh = useRefreshAfterMutation()
  return useMutation({
    mutationFn: ({ taskId, values }: { taskId: string; values: EntryValues }) => createManualTimeEntry(taskId, values),
    onSuccess: refresh,
  })
}
