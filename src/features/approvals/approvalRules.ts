import { ApiError } from '@/lib/api'

import { NOTE_MAX, REJECT_NOTE_MIN, type ApprovalDecision } from './types'

// Fungsi murni halaman Antrean Approval (port logika "TM Konfirmasi Approval.dc.html" / "TM Antrean Approval.dc.html").

// validateDecisionNote -- tolak wajib beralasan >= 5 karakter (pesan persis desain); setuju opsional.
// Maks NOTE_MAX adalah tambahan (desain tidak membatasi, IG-149).
export function validateDecisionNote(decision: ApprovalDecision, note: string): string {
  const n = note.trim()
  if (decision === 'reject' && n.length < REJECT_NOTE_MIN) {
    return `Alasan penolakan minimal ${REJECT_NOTE_MIN} karakter agar assignee tahu apa yang perlu diperbaiki.`
  }
  if (n.length > NOTE_MAX) return `Catatan maksimal ${NOTE_MAX} karakter.`
  return ''
}

export function decisionNotice(decision: ApprovalDecision, code: string): string {
  return decision === 'approve'
    ? `Task ${code} disetujui dan dipindahkan ke DONE. Assignee diberi notifikasi.`
    : `Task ${code} ditolak dan dikembalikan ke IN PROGRESS. Assignee diberi notifikasi beserta alasan.`
}

// describeDecisionError -- pesan galat server untuk ditampilkan di dalam modal.
export function describeDecisionError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'TASK_NOT_UNDER_REVIEW') return 'Task ini sudah tidak berstatus UNDER REVIEW — mungkin sudah diputuskan. Muat ulang antrean.'
    if (err.code === 'FORBIDDEN') return 'Role Anda tidak dapat memutuskan approval pada task ini.'
    if (err.code === 'NOT_FOUND') return 'Task tidak ditemukan.'
    if (err.code === 'VALIDATION_ERROR' && err.message) return err.message
  }
  return 'Gagal menyimpan keputusan. Coba lagi.'
}

export const DECISION_BADGE = {
  approved: { label: 'DISETUJUI', text: 'text-mint', border: 'border-mint' },
  rejected: { label: 'DITOLAK', text: 'text-red', border: 'border-red' },
} as const
