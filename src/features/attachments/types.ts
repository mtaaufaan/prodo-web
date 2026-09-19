// Attachment Management (H20-22, S4W-19/20/21, EPIC 10, US-064/064b/065/066).
// Cakupan HANYA attachment di deskripsi task -- komentar (task_comments)
// dan version history (US-064c) belum ada, di luar cakupan.
export interface Attachment {
  id: string
  task_id: string
  uploader_id: string
  uploader_name: string
  uploader_email: string
  original_name: string
  display_name: string
  mime_type: string
  size_bytes: number
  is_image: boolean
  created_at: string
  deleted_at: string | null
  purge_scheduled_at: string | null
  // Hanya terisi dari getWorkspaceDocuments (grid "AW Documents").
  status?: 'active' | 'orphan' | 'deleted'
  task_code?: string | null
  task_title?: string
  project_id?: string
  project_name?: string
  sprint_name?: string | null
}

export interface QuotaOverview {
  quota_bytes: number
  used_bytes: number
  retention_days: number
  per_project: { project_id: string; project_name: string; bytes: number; file_count: number }[]
}

export interface DocumentFilter {
  project_id?: string
  status?: string // '' (aktif & orphan) | 'active' | 'orphan' | 'deleted' | 'all'
  ext?: string
  uploader_id?: string
  sort?: string // '' (terbesar) | 'smallest' | 'newest' | 'oldest' | 'name'
}

// ALLOWED_EXTENSIONS -- persis US-064 AC, dipakai validasi klien SEBELUM
// upload (server tetap validasi ulang, ini cuma UX -- pesan error cepat
// tanpa menunggu round-trip).
export const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv',
  'zip', 'rar', '7z',
  'json', 'xml',
]

export const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024

export function fileExt(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx < 0 || idx === name.length - 1 ? '' : name.slice(idx + 1).toLowerCase()
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return bytes + ' B'
}
