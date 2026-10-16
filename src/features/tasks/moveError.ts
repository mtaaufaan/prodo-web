// describeMoveError -- pesan galat pindah status (Board Kanban dan Task Saya).
export function describeMoveError(err: unknown): string {
  const apiErr = err as { code?: string; details?: { blocking_tasks?: { task_code: string; title: string }[] } }
  if (apiErr.code === 'PIC_NOT_IN_GROUP') return 'PIC Group status ini belum memuat member yang Anda pilih. Minta Project Manager menambah anggota PIC Group.'
  if (apiErr.code === 'TASK_INCOMPLETE') return 'Task ini masih ditandai "Belum Lengkap" -- tandai Lengkap dulu sebelum mengubah status (kecuali ke BLOCKED).'
  if (apiErr.code === 'TASK_NOT_IN_SPRINT') return 'Task ini belum berada di sprint yang sedang aktif -- pindahkan ke sprint aktif dulu sebelum mengubah status (kecuali ke BLOCKED).'
  if (apiErr.code === 'DEPENDENCY_HARD_BLOCK') {
    const names = (apiErr.details?.blocking_tasks ?? []).map((t) => `${t.task_code} (${t.title})`).join(', ')
    return `Task ini diblokir predecessor yang belum selesai: ${names || '-'}.`
  }
  return 'Gagal mengubah status task.'
}
