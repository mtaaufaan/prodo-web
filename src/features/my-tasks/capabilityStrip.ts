import type { Capabilities } from '@/features/context/types'

// Strip kemampuan di atas halaman Task Saya ("TM Task Saya.dc.html": CAPS per role -- label, catatan, warna).
// Hanya petunjuk tampilan; hak akses sebenarnya ditegakkan backend.
export interface CapabilityStrip {
  label: string
  note: string
  // kelas Tailwind teks + border
  tone: string
}

const EDITOR_NOTE = 'Dapat mengubah task yang ditugaskan, mencatat waktu, dan berkomentar. Tidak dapat menyetujui atau mengubah struktur project.'
const APPROVER_NOTE = 'Dapat menyetujui atau menolak task pada tahap review dan berkomentar. Tidak dapat mengubah isi task.'
const VIEWER_NOTE = 'Hanya dapat melihat task, board, dan laporan. Tidak dapat membuat, mengubah, atau berkomentar.'

// capabilityStrip -- Approver ungu, Editor mint, Viewer abu "HANYA BACA"; role lain (PM/Admin Workspace/Division
// Viewer) memakai label role tanpa catatan (desain hanya mendefinisikan tiga varian).
export function capabilityStrip(caps: Capabilities | undefined, role: string | undefined): CapabilityStrip {
  if (caps?.approve_task && !caps.manage_project) return { label: 'AKSES APPROVER', note: APPROVER_NOTE, tone: 'border-violet text-violet' }
  if (caps?.edit_own_task && !caps.manage_project) return { label: 'AKSES EDITOR', note: EDITOR_NOTE, tone: 'border-mint text-mint' }
  if (role === 'viewer') return { label: 'AKSES VIEWER · HANYA BACA', note: VIEWER_NOTE, tone: 'border-text-muted text-text-muted' }
  return { label: `AKSES ${(role ?? 'editor').toUpperCase().replace(/_/g, ' ')}`, note: '', tone: 'border-text-muted text-text-muted' }
}
