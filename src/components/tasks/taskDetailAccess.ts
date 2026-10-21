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
  // canDecide -- seksi KEPUTUSAN APPROVAL (Setujui/Tolak, S7A-09): hanya mode Approver; PM/AW memakai chip status biasa.
  canDecide: boolean
  // canStartWhenPic -- "Mulai Pengerjaan" untuk role baca-saja yang boleh memulai bila PIC aktif (Approver, matriks No 10b).
  canStartWhenPic: boolean
  // canLogTime -- timer dan entri manual: PM/AW dan Editor pada task miliknya; Approver/Viewer tidak mencatat waktu.
  canLogTime: boolean
  readOnlyReason: string
  // statusLockReason -- teks kunci chip PINDAHKAN STATUS saat canMove false.
  statusLockReason: string
  // timeLockReason -- teks kunci CATATAN WAKTU saat canLogTime false.
  timeLockReason: string
}

const STATUS_LOCK = 'Status task ini tidak dapat Anda ubah.'
const STATUS_LOCK_APPROVER = 'Status task diubah lewat keputusan Setujui/Tolak pada task UNDER REVIEW.'
const TIME_LOCK_OWN = 'Pencatatan waktu hanya untuk task milik Anda.'
const TIME_LOCK_APPROVER = 'Approver tidak mencatat waktu kerja.'
const TIME_LOCK_READ = 'Role Anda tidak mencatat waktu kerja.'

export const FULL_TASK_ACCESS: TaskDetailAccess = {
  readOnly: false,
  canMove: true,
  canAttach: true,
  canComment: true,
  canDelete: true,
  canRemovePic: true,
  canApproveTime: true,
  canSetStoryPoints: true,
  canDecide: false,
  canStartWhenPic: false,
  canLogTime: true,
  readOnlyReason: '',
  statusLockReason: STATUS_LOCK,
  timeLockReason: TIME_LOCK_OWN,
}

// taskDetailAccess -- capabilities belum termuat/tidak diketahui -> akses penuh (perilaku sebelum S6E-07).
export function taskDetailAccess(caps: Capabilities | undefined, task: Task | undefined, userId: string | undefined, allowEditorStoryPoints = false): TaskDetailAccess {
  if (!caps || caps.manage_project) return FULL_TASK_ACCESS
  if (caps.edit_own_task) {
    if (task && isOwnTask(task, userId)) {
      return { ...FULL_TASK_ACCESS, canAttach: caps.attach, canComment: caps.comment, canDelete: false, canRemovePic: false, canApproveTime: false, canSetStoryPoints: allowEditorStoryPoints, canLogTime: caps.log_time }
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
      canLogTime: false,
      readOnlyReason: 'Task ini bukan milik Anda -- hanya assignee atau PIC aktif yang dapat mengubahnya. Anda tetap dapat membaca dan berkomentar.',
    }
  }
  // Role baca-saja. Approver (caps.attach) tetap boleh melampirkan dan berkomentar (desain `dCanAttach`, PRD US-064)
  // dan memutuskan approval (S7A-09); Viewer/Division Viewer: hanya membaca.
  return {
    ...FULL_TASK_ACCESS,
    readOnly: true,
    canMove: false,
    canAttach: caps.attach,
    canComment: caps.comment,
    canDelete: false,
    canRemovePic: false,
    canApproveTime: false,
    canSetStoryPoints: false,
    canDecide: caps.approve_task,
    canStartWhenPic: caps.approve_task,
    canLogTime: false,
    // Kalimat desain apa adanya: di PRODO "mengubah status" bagi Approver = keputusan Setujui/Tolak (USE_APPROVAL).
    readOnlyReason: caps.attach
      ? 'Sebagai Approver Anda dapat mengubah status task, melampirkan berkas, dan berkomentar — namun tidak mengubah judul, deskripsi, atau assignee.'
      : 'Role Anda hanya dapat membaca task ini.',
    statusLockReason: caps.approve_task ? STATUS_LOCK_APPROVER : STATUS_LOCK,
    timeLockReason: caps.approve_task ? TIME_LOCK_APPROVER : TIME_LOCK_READ,
  }
}
