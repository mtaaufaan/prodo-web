// describeMoveError -- pesan galat pindah status (Board Kanban dan Task Saya).
// NOT_YOUR_TASK / BULK_NOT_ALLOWED: hak role Editor di backend (S6E-06, IG-137).
export function describeMoveError(err: unknown): string {
  const apiErr = err as { code?: string; details?: { blocking_tasks?: { task_code: string; title: string }[] } }
  if (apiErr.code === 'NOT_YOUR_TASK') return 'Anda hanya dapat mengubah task yang ditugaskan kepada Anda.'
  if (apiErr.code === 'BULK_NOT_ALLOWED') return 'Role Anda tidak dapat memakai aksi bulk.'
  if (apiErr.code === 'PIC_NOT_IN_GROUP') return 'PIC Group status ini belum memuat member yang Anda pilih. Minta Project Manager menambah anggota PIC Group.'
  if (apiErr.code === 'TASK_INCOMPLETE') return 'Task ini masih ditandai "Belum Lengkap" -- tandai Lengkap dulu sebelum mengubah status (kecuali ke BLOCKED).'
  if (apiErr.code === 'TASK_NOT_IN_SPRINT') return 'Task ini belum berada di sprint yang sedang aktif -- pindahkan ke sprint aktif dulu sebelum mengubah status (kecuali ke BLOCKED).'
  if (apiErr.code === 'DEPENDENCY_HARD_BLOCK') {
    const names = (apiErr.details?.blocking_tasks ?? []).map((t) => `${t.task_code} (${t.title})`).join(', ')
    return `Task ini diblokir predecessor yang belum selesai: ${names || '-'}.`
  }
  return 'Gagal mengubah status task.'
}

// describeCompleteError -- pesan galat tandai lengkap/belum lengkap (kartu Kanban).
export function describeCompleteError(err: unknown): string {
  const code = (err as { code?: string }).code
  if (code === 'NOT_YOUR_TASK') return 'Anda hanya dapat mengubah task yang ditugaskan kepada Anda.'
  if (code === 'NOT_BACKLOG_PIC') return 'Hanya PIC backlog task ini yang dapat menandai lengkap.'
  return 'Gagal mengubah kelengkapan task.'
}
