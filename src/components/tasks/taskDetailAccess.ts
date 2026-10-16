import type { Capabilities } from '@/features/context/types'
import type { Task } from '@/features/tasks/types'

import { isOwnTask } from './boardMode'

// Hak akses modal Task Detail per role (S6E-07, Sprint 6 "Editor Console"; props readOnly/canMove/
// canAttach/readOnlyReason di "PM Task Detail.dc.html"). Hanya petunjuk tampilan -- penegak sebenarnya
// backend (S6E-06 NOT_YOUR_TASK dst).
export interface TaskDetailAccess {
  // readOnly -- judul/deskripsi/sub-task/dependency/PIC tidak bisa diubah (desain: canEdit = !readOnly).
  readOnly: boolean
  // canMove -- chip PINDAHKAN STATUS aktif.
  canMove: boolean
  // canAttach -- unggah lampiran.
  canAttach: boolean
  canComment: boolean
  // canDelete -- tombol Hapus task: hanya Admin Workspace/Project Manager (matriks RBAC baris 14).
  canDelete: boolean
  // canRemovePic -- "✕ HAPUS PIC": hanya PM/AW (desain).
  canRemovePic: boolean
  // canApproveTime -- setujui/tolak entri timesheet: hanya PM/AW.
  canApproveTime: boolean
  // canSetStoryPoints -- story point: PM/AW selalu; Editor hanya bila project mengizinkan (S6E-08, IG-139).
  canSetStoryPoints: boolean
  readOnlyReason: string
}

export const FULL_TASK_ACCESS: TaskDetailAccess = {
  readOnly: false,
  canMove: true,
  canAttach: true,
  canComment: true,
  canDelete: true,
  canRemovePic: true,
  canApproveTime: true,
  canSetStoryPoints: true,
  readOnlyReason: '',
}

// taskDetailAccess -- capabilities belum termuat/tidak diketahui -> akses penuh (perilaku sebelum S6E-07).
export function taskDetailAccess(caps: Capabilities | undefined, task: Task | undefined, userId: string | undefined, allowEditorStoryPoints = false): TaskDetailAccess {
  if (!caps || caps.manage_project) return FULL_TASK_ACCESS
  if (caps.edit_own_task) {
    if (task && isOwnTask(task, userId)) {
      return { ...FULL_TASK_ACCESS, canAttach: caps.attach, canComment: caps.comment, canDelete: false, canRemovePic: false, canApproveTime: false, canSetStoryPoints: allowEditorStoryPoints }
    }
    return {
      ...FULL_TASK_ACCESS,
      readOnly: true,
      canMove: false,
      canAttach: false,
      canComment: caps.comment,
      canDelete: false,
      canRemovePic: false,
      canApproveTime: false,
      canSetStoryPoints: false,
      readOnlyReason: 'Task ini bukan milik Anda -- hanya assignee atau PIC aktif yang dapat mengubahnya. Anda tetap dapat membaca dan berkomentar.',
    }
  }
  return {
    ...FULL_TASK_ACCESS,
    readOnly: true,
    canMove: false,
    canAttach: false,
    canComment: caps.comment,
    canDelete: false,
    canRemovePic: false,
    canApproveTime: false,
    canSetStoryPoints: false,
    readOnlyReason: 'Role Anda hanya dapat membaca task ini.',
  }
}
