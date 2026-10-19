import type { Attachment } from '@/features/attachments/types'

import { mockProjects, mockTasks } from './editorFixtures'

// Data tiruan "Lampiran Saya" Editor (S6E-11, IG-142) -- BERSTATE di memori: file yang saya unggah lintas
// project (termasuk satu orphan dan satu dalam retensi), rename/hapus-retensi milik sendiri. Dibuang di S6E-12
// saat endpoint GET /workspaces/:id/my-attachments tersambung ke backend.
const ME = 'mock-editor-id'
const ME_NAME = 'Eka Editor'
const DAY = 86_400_000

const projectName = (id: string) => mockProjects.find((p) => p.id === id)?.name ?? ''
const taskOf = (id: string) => mockTasks.find((t) => t.id === id)

function seed(n: number, name: string, taskId: string, projectId: string, kb: number, daysAgo: number, extra: Partial<Attachment> = {}): Attachment {
  const t = taskOf(taskId)
  return {
    id: `mine-${n}`,
    task_id: taskId,
    uploader_id: ME,
    uploader_name: ME_NAME,
    uploader_email: 'editor@prodo.local',
    original_name: name,
    display_name: name,
    mime_type: 'application/octet-stream',
    size_bytes: kb * 1024,
    is_image: /\.(png|jpe?g|gif|webp)$/i.test(name),
    created_at: new Date(Date.now() - daysAgo * DAY).toISOString(),
    deleted_at: null,
    purge_scheduled_at: null,
    status: 'active',
    task_code: t?.task_code ?? 'PRD-001',
    task_title: t?.title ?? 'Task project PRODO',
    project_id: projectId,
    project_name: projectName(projectId),
    sprint_name: t?.sprint_name ?? null,
    ...extra,
  }
}

const QUEST = 'mock-proj-quest'
const PRODO = 'mock-proj-prodo'

let items: Attachment[] = [
  seed(1, 'wireframe-login.png', `${QUEST}-mt-1`, QUEST, 840, 2),
  seed(2, 'spesifikasi-daftar-quest.pdf', `${QUEST}-mt-2`, QUEST, 2400, 5),
  seed(3, 'log-sinkronisasi.txt', `${QUEST}-mt-3`, QUEST, 36, 6),
  seed(4, 'rekap-uji-beban.xlsx', `${QUEST}-mt-8`, QUEST, 5200, 9),
  seed(5, 'aset-ikon.zip', `${QUEST}-mt-9`, QUEST, 12800, 12),
  seed(6, 'catatan-rapat.md', `${PRODO}-mt-1`, PRODO, 8, 14),
  seed(7, 'draf-proposal.docx', `${PRODO}-mt-2`, PRODO, 940, 20),
  seed(8, 'mockup-lama.png', `${QUEST}-mt-99`, QUEST, 1500, 30, { status: 'orphan', task_title: 'Task sudah dihapus', task_code: 'QST-099', sprint_name: null }),
  seed(9, 'data-uji-lama.csv', `${QUEST}-mt-5`, QUEST, 120, 40, {
    status: 'deleted',
    deleted_at: new Date(Date.now() - 3 * DAY).toISOString(),
    purge_scheduled_at: new Date(Date.now() + 27 * DAY).toISOString(),
  }),
]

export function listMyAttachments(): Attachment[] {
  return items
}

// Unggahan baru dari Task Detail ikut tampil di sini (satu sumber data tiruan).
export function registerMyUpload(a: Attachment) {
  const t = taskOf(a.task_id)
  items = [{ ...a, status: 'active', task_code: t?.task_code ?? null, task_title: t?.title ?? '', project_id: t?.project_id, project_name: projectName(t?.project_id ?? ''), sprint_name: t?.sprint_name ?? null }, ...items]
}

export type MineFail = 'NOT_FOUND' | 'FORBIDDEN'

export function renameMine(id: string, displayName: string): true | MineFail {
  const a = items.find((x) => x.id === id)
  if (!a) return 'NOT_FOUND'
  if (a.uploader_id !== ME) return 'FORBIDDEN'
  a.display_name = displayName
  return true
}

export function deleteMine(id: string): true | MineFail {
  const a = items.find((x) => x.id === id)
  if (!a) return 'NOT_FOUND'
  if (a.uploader_id !== ME) return 'FORBIDDEN'
  a.status = 'deleted'
  a.deleted_at = new Date().toISOString()
  a.purge_scheduled_at = new Date(Date.now() + 30 * DAY).toISOString()
  return true
}

export function findMine(id: string): Attachment | undefined {
  return items.find((x) => x.id === id)
}
