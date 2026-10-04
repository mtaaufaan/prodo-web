import { apiClient } from '@/lib/api'

import type { PicGroupMember } from './types'

export function listPicGroups(projectId: string) {
  return apiClient.get<PicGroupMember[]>(`/api/v1/projects/${projectId}/pic-groups`)
}

// Ganti SELURUH anggota PIC Group satu status (kosong = Full handoff).
export function replacePicGroup(projectId: string, statusId: string, userIds: string[]) {
  return apiClient.put<PicGroupMember[]>(`/api/v1/projects/${projectId}/pic-groups/${statusId}`, { user_ids: userIds })
}
