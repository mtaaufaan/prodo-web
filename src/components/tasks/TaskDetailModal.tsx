import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadAttachment } from '@/features/attachments/api'
import { useDeleteAttachment, useRenameAttachment, useTaskAttachments, useUploadAttachment } from '@/features/attachments/hooks'
import { ALLOWED_EXTENSIONS, MAX_ATTACHMENT_SIZE_BYTES, fileExt, formatBytes } from '@/features/attachments/types'
import { useProjectMembers } from '@/features/project-members/hooks'
import {
  useAcknowledgePic,
  useActiveTimer,
  useAddDependency,
  useApproveTimeEntry,
  useCreateChecklistItem,
  useCreateManualTimeEntry,
  useDeleteChecklistItem,
  useDeleteTask,
  usePicHistory,
  useProjectTasks,
  useRejectTimeEntry,
  useRemoveDependency,
  useSetCompleteness,
  useSetTaskStatus,
  useStartTimer,
  useStartWork,
  useStopTimer,
  useTask,
  useTaskActivity,
  useTaskChecklistItems,
  useTaskDependencies,
  useTaskStatusSessions,
  useTaskTimeEntries,
  useTaskVersions,
  useUpdateChecklistItem,
  useUpdateTask,
} from '@/features/tasks/hooks'
import { FIBONACCI_STORY_POINTS, type CustomStatus, type TaskPriority } from '@/features/tasks/types'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical']
const PRIORITY_BADGE_TONE: Record<TaskPriority, string> = {
  low: 'border-line-strong text-text-muted',
  medium: 'border-blue text-blue',
  high: 'border-amber text-amber',
  critical: 'border-destructive text-destructive',
}

// formatDuration -- Phase 4 (US-018b/S4-66): "2j 15m", dipakai StatusTimeline.
// Queue/Active/Lead Time dihitung di klien dari raw session rows (bukan
// agregat backend terpisah -- lihat komentar TaskStatusSession di types.ts).
function formatDuration(ms: number): string {
  if (ms <= 0) return '0m'
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`
}

// describeTaskAction -- IG-94/IG-97, narasi tab AKTIVITAS per action
// (pola sama formatAuditNarrative Workspace/Group Audit Trail -- setiap
// action baru butuh case sendiri di sini, fallback generik untuk yang
// belum dipetakan).
function describeTaskAction(action: string, before: Record<string, unknown> | null, after: Record<string, unknown> | null, metadata: Record<string, unknown> | null): string {
  switch (action) {
    case 'task.created':
      return `Task dibuat: "${(after as { title?: string } | null)?.title ?? metadata?.title ?? ''}"`
    case 'task.updated':
      return `Field task diperbarui: "${(after as { title?: string } | null)?.title ?? ''}"`
    case 'task.status_changed':
      return `Status diubah dari ${(before as { status?: string } | null)?.status ?? '—'} ke ${(after as { status?: string } | null)?.status ?? '—'}`
    case 'task.completeness_changed':
      return `Kelengkapan diubah jadi "${(after as { completeness?: string } | null)?.completeness ?? '—'}"`
    case 'task.deleted':
      return 'Task dihapus'
    case 'task.dependency_added':
      return 'Dependency baru ditambahkan'
    case 'task.dependency_removed':
      return 'Dependency dihapus'
    case 'task.pic_acknowledged':
      return 'Serah terima PIC dikonfirmasi'
    case 'attachment.uploaded':
      return `Lampiran diunggah: "${(metadata as { name?: string } | null)?.name ?? ''}"`
    case 'attachment.renamed':
      return 'Lampiran diganti nama'
    case 'attachment.deleted':
      return 'Lampiran dihapus'
    case 'attachment.restored':
      return 'Lampiran dipulihkan'
    default:
      return action
  }
}

type DetailTab = 'overview' | 'deps' | 'pic' | 'attach' | 'time' | 'versions' | 'activity'

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'overview', label: 'RINGKASAN' },
  { key: 'deps', label: 'DEPENDENCY' },
  { key: 'pic', label: 'PIC FASE' },
  { key: 'attach', label: 'LAMPIRAN' },
  { key: 'time', label: 'WAKTU STATUS' },
  { key: 'versions', label: 'RIWAYAT VERSI' },
  { key: 'activity', label: 'AKTIVITAS' },
]

interface TaskDetailModalProps {
  taskId: string | null
  onClose: () => void
  projectId: string
  statuses: CustomStatus[]
}

// TaskDetailModal (Task Management Core Phase 1/2/3/4, + LAMPIRAN H20
// S4W-20/EPIC 10). Navigasi 7 tab mengikuti desain "PM Task Detail.dc.html"
// (IG-97, gap-check diminta user, dikerjakan LENGKAP "sama seperti desain
// aslinya" -- sebelumnya SEMUA section digabung satu scroll panjang).
// RINGKASAN (+DESKRIPSI, susulan IG-97 -- sebelumnya field description task
// TIDAK PERNAH ditampilkan/diedit sama sekali di modal ini meski ada di
// AddTaskModal, onSave lama diam-diam MENGOSONGKAN deskripsi tiap simpan
// karena tidak pernah ikut dikirim -- bug pre-existing, ditemukan sekalian
// saat membangun RIWAYAT VERSI), DEPENDENCY, PIC FASE, LAMPIRAN: lihat+edit
// field dasar, ganti status via chip + pilih PIC (Phase 2, S4-31/32) +
// riwayat PIC, toggle kelengkapan (Phase 3, S4-44/45), dependency
// Finish-to-Start (Phase 3, S4-51/52 -- "autocomplete" disederhanakan jadi
// <select> native, LINGKARAN DEPENDENCY ditampilkan sebagai teks error
// polos bukan panel khusus -- simplifikasi kecil diterima), tombol "Mulai
// Pengerjaan". WAKTU STATUS lengkap: widget Queue/Active/Lead Time (Phase
// 4, S4-65/66) + breakdown AKUMULASI PER STATUS + TIMELINE SESI
// KRONOLOGIS (keduanya baru, dari raw session rows yang sama) + widget
// Timesheet (start/stop timer + entri manual + approval AW/PM, IG-97/
// US-036/037 -- DIMAJUKAN dari Sprint S8 asli, TIDAK ADA di desain
// "PM Task Detail.dc.html" sendiri jadi ditaruh di sini sebagai section
// tambahan, keputusan penempatan disengaja). RIWAYAT VERSI (snapshot
// deskripsi tiap disimpan, IG-97) dan AKTIVITAS (feed audit_logs task,
// menutup IG-94 -- audit_logs task sebelumnya kosong total sejak Phase 1)
// KEDUANYA sudah lengkap. LAMPIRAN: rename/hapus di FE cuma ditampilkan
// untuk pengunggah sendiri (server tetap mengizinkan PM/AW lewat endpoint
// yang sama; PM/AW mengelola lampiran user lain lewat halaman "AW
// Documents", bukan dari modal ini). PIC handoff TETAP picker checklist
// polos (bukan alur 2-langkah "SERAHKAN DARI"→"SERAHKAN KE" desain saat
// PIC aktif >1) -- simplifikasi kecil diterima, sama pola PicPickerModal
// Kanban.
export default function TaskDetailModal({ taskId, onClose, projectId, statuses }: TaskDetailModalProps) {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const task = useTask(taskId)
  const members = useProjectMembers(projectId, true)
  const projectTasks = useProjectTasks(projectId)
  const update = useUpdateTask(projectId)
  const setStatus = useSetTaskStatus(projectId)
  const remove = useDeleteTask(projectId)
  const acknowledge = useAcknowledgePic(taskId ?? '')
  const picHistory = usePicHistory(taskId)
  const setCompleteness = useSetCompleteness(projectId)
  const dependencies = useTaskDependencies(taskId)
  const addDependency = useAddDependency(projectId)
  const removeDependency = useRemoveDependency(projectId)
  const startWork = useStartWork(taskId ?? '')
  const statusSessions = useTaskStatusSessions(taskId)
  const attachments = useTaskAttachments(taskId)
  const uploadAttachment = useUploadAttachment(taskId ?? '')
  const renameAttachment = useRenameAttachment(taskId ?? '')
  const deleteAttachmentMut = useDeleteAttachment(taskId ?? '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const versions = useTaskVersions(taskId)
  const activeTimer = useActiveTimer(taskId)
  const timeEntries = useTaskTimeEntries(taskId)
  const startTimer = useStartTimer(taskId ?? '')
  const stopTimer = useStopTimer(taskId ?? '')
  const createManualEntry = useCreateManualTimeEntry(taskId ?? '')
  const approveEntry = useApproveTimeEntry(taskId ?? '')
  const rejectEntry = useRejectTimeEntry(taskId ?? '')
  const checklistItems = useTaskChecklistItems(taskId)
  const createChecklistItem = useCreateChecklistItem(taskId ?? '')
  const updateChecklistItem = useUpdateChecklistItem(taskId ?? '')
  const deleteChecklistItem = useDeleteChecklistItem(taskId ?? '')

  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [activityPage, setActivityPage] = useState(1)
  const activity = useTaskActivity(taskId, activityPage)
  // fieldEditing -- kotak "FIELD TASK" (judul+deskripsi+priority/due/
  // estimasi/SP) DISATUKAN jadi satu area edit dengan satu tombol Simpan
  // (susulan 2026-09-24, diminta user "supaya tidak terlalu banyak
  // tombol simpan" -- desain aslinya memisah DESKRIPSI jadi tombol
  // sendiri, sengaja disederhanakan).
  const [fieldEditing, setFieldEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [storyPoints, setStoryPoints] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [manualStart, setManualStart] = useState('')
  const [manualEnd, setManualEnd] = useState('')
  const [manualNote, setManualNote] = useState('')
  const [timeError, setTimeError] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null)
  const [subtaskDraft, setSubtaskDraft] = useState('')
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)
  const [picSelection, setPicSelection] = useState<string[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [picError, setPicError] = useState('')
  const [depSearch, setDepSearch] = useState('')
  const [depError, setDepError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [attachError, setAttachError] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // notice -- auto-hilang setelah 15 detik (pola sama AwRuleAutomationPage
  // exportNotice), DAN langsung hilang begitu pindah tab (susulan
  // 2026-09-24, diminta user -- notice dari tab A jangan terbawa ke tab B).
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 15000)
    return () => clearTimeout(t)
  }, [notice])

  useEffect(() => {
    setNotice('')
  }, [activeTab])

  useEffect(() => {
    if (task.data) {
      setTitle(task.data.title)
      setDescription(typeof task.data.description === 'string' ? task.data.description : '')
      setPriority(task.data.priority)
      setDueDate(task.data.due_date ?? '')
      setEstimatedHours(task.data.estimated_hours != null ? String(task.data.estimated_hours) : '')
      setStoryPoints(task.data.story_points)
    }
    setActiveTab('overview')
    setActivityPage(1)
    setFieldEditing(false)
    setNotice('')
    setPendingStatusId(null)
    setPicSelection([])
    setPicError('')
    setHistoryOpen(false)
    setDepSearch('')
    setDepError('')
    setSaveError('')
    setAttachError('')
    setRenamingId(null)
    setRenameDraft('')
    setDeleteConfirmId(null)
    setManualStart('')
    setManualEnd('')
    setManualNote('')
    setTimeError('')
    setRejectingId(null)
    setRejectNote('')
    setNewSubtaskTitle('')
    setEditingSubtaskId(null)
    setSubtaskDraft('')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sinkron SEKALI saat task berganti (by id), bukan tiap refetch
  }, [task.data?.id, taskId])

  if (!taskId) return null

  // fieldDirty -- judul/deskripsi/priority/due/estimasi/SP SEKARANG satu
  // area edit ("FIELD TASK") (susulan 2026-09-24, diminta user "supaya
  // tidak terlalu banyak tombol simpan" -- desain aslinya memisah
  // DESKRIPSI jadi tombol simpan sendiri, sengaja disatukan di sini).
  const fieldDirty =
    fieldEditing &&
    !!task.data &&
    (title.trim() !== task.data.title ||
      description !== (typeof task.data.description === 'string' ? task.data.description : '') ||
      priority !== task.data.priority ||
      dueDate !== (task.data.due_date ?? '') ||
      estimatedHours !== (task.data.estimated_hours != null ? String(task.data.estimated_hours) : '') ||
      storyPoints !== task.data.story_points)

  // handleCancelField -- "Batal" mengembalikan SEMUA draft (termasuk
  // deskripsi) ke nilai task.data (susulan 2026-09-15 "jadikan ini
  // standar" -- draft yang diketik lalu Batal tidak boleh nyangkut
  // sampai sesi Edit berikutnya).
  const handleCancelField = () => {
    if (task.data) {
      setTitle(task.data.title)
      setDescription(typeof task.data.description === 'string' ? task.data.description : '')
      setPriority(task.data.priority)
      setDueDate(task.data.due_date ?? '')
      setEstimatedHours(task.data.estimated_hours != null ? String(task.data.estimated_hours) : '')
      setStoryPoints(task.data.story_points)
    }
    setFieldEditing(false)
    setSaveError('')
  }

  // onSaveField -- SATU chokepoint PUT /tasks/:id, SATU tombol Simpan
  // Perubahan untuk seluruh FIELD TASK (judul+deskripsi+priority+due+
  // estimasi+SP sekaligus).
  const onSaveField = () => {
    if (!task.data) return
    setSaveError('')
    update.mutate(
      {
        taskId,
        values: {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          due_date: dueDate,
          estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
          story_points: storyPoints,
          sprint_id: task.data.sprint_id,
          assignee_ids: task.data.assignees.map((a) => a.user_id),
        },
      },
      {
        onSuccess: () => { setNotice('Task diperbarui.'); setFieldEditing(false) },
        onError: (err: unknown) => {
          const apiErr = err as { code?: string }
          setSaveError(
            apiErr.code === 'STORY_POINTS_NOT_ALLOWED'
              ? 'Anda tidak berwenang mengubah story point task ini -- hanya PM/AW atau Editor yang diizinkan project ini.'
              : 'Gagal menyimpan perubahan.',
          )
        },
      },
    )
  }

  // openPicPicker -- klik chip status membuka panel pilih PIC (S4-31/32:
  // ganti status SELALU butuh PIC baru), bukan langsung berpindah seperti
  // Phase 1.
  const openPicPicker = (statusId: string) => {
    setPendingStatusId(statusId)
    setPicSelection([])
    setPicError('')
  }

  const togglePic = (userId: string) => {
    setPicSelection((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
    setPicError('')
  }

  const onConfirmMove = () => {
    if (!pendingStatusId) return
    if (picSelection.length === 0) {
      setPicError('Pilih minimal satu PIC untuk fase status baru ini.')
      return
    }
    setStatus.mutate(
      { taskId, statusId: pendingStatusId, picIds: picSelection },
      {
        onSuccess: () => {
          setNotice('Status task diperbarui dan PIC fase baru ditetapkan.')
          setPendingStatusId(null)
          setPicSelection([])
        },
        onError: (err: unknown) => {
          const apiErr = err as { code?: string; details?: { blocking_tasks?: { task_code: string; title: string }[] } }
          if (apiErr.code === 'PIC_NOT_IN_GROUP') {
            setPicError('PIC Group status ini belum memuat member yang Anda pilih. Minta Project Manager menambah anggota PIC Group.')
          } else if (apiErr.code === 'TASK_INCOMPLETE') {
            setPicError('Task ini masih ditandai "Belum Lengkap" -- tandai Lengkap dulu sebelum mengubah status (kecuali ke BLOCKED).')
          } else if (apiErr.code === 'DEPENDENCY_HARD_BLOCK') {
            const names = (apiErr.details?.blocking_tasks ?? []).map((t) => `${t.task_code} (${t.title})`).join(', ')
            setPicError(`Task ini diblokir predecessor yang belum selesai: ${names || '-'}.`)
          } else {
            setPicError('Gagal mengubah status task.')
          }
        },
      },
    )
  }

  const onDelete = () => {
    remove.mutate(taskId, { onSuccess: onClose })
  }

  // onAddDependency -- S4-47/51/52: backend deteksi circular (409
  // CIRCULAR_DEPENDENCY dengan cycle_path) -- FE TIDAK menghitung ulang
  // graph di client, cukup tampilkan pesan dari server. candidateId
  // diklik langsung dari baris kandidat (desain: tombol "MENUNGGU INI"
  // per baris, bukan dropdown+tombol terpisah).
  const onAddDependency = (candidateId: string) => {
    addDependency.mutate(
      { taskId, predecessorTaskId: candidateId },
      {
        onSuccess: () => setDepSearch(''),
        onError: (err: unknown) => {
          const apiErr = err as { code?: string; details?: { cycle_path?: string[] } }
          if (apiErr.code === 'CIRCULAR_DEPENDENCY') {
            setDepError(`Menutup lingkaran: ${(apiErr.details?.cycle_path ?? []).join(' → ')}`)
          } else if (apiErr.code === 'DEPENDENCY_ALREADY_EXISTS') {
            setDepError('Dependency ini sudah ada.')
          } else {
            setDepError('Gagal menambah dependency.')
          }
        },
      },
    )
  }

  // handleUpload -- validasi ekstensi klien (US-064 AC), server tetap
  // validasi ulang via sniff MIME -- ini murni supaya error cepat tanpa
  // menunggu round-trip untuk kasus yang jelas salah.
  const handleUpload = (file: File | undefined) => {
    if (!file || !taskId) return
    setAttachError('')
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setAttachError('Ukuran file melebihi 50 MB.')
      return
    }
    if (!ALLOWED_EXTENSIONS.includes(fileExt(file.name))) {
      setAttachError('Tipe file ini tidak diizinkan.')
      return
    }
    uploadAttachment.mutate(file, {
      onError: (err: unknown) => {
        const apiErr = err as { code?: string }
        setAttachError(
          apiErr.code === 'STORAGE_QUOTA_FULL'
            ? 'Penyimpanan organisasi penuh. Hubungi Group Admin Anda untuk menambah kuota.'
            : apiErr.code === 'FILE_TYPE_NOT_ALLOWED'
              ? 'Tipe file ini tidak diizinkan.'
              : 'Gagal mengunggah lampiran.',
        )
      },
    })
  }

  const onDownloadAttachment = async (id: string, name: string) => {
    const blob = await downloadAttachment(id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // onCreateManualEntry -- Timesheet entri manual (US-037), butuh approval
  // AW/PM sebelum dihitung ke jam tercatat.
  const onCreateManualEntry = () => {
    setTimeError('')
    if (!manualStart || !manualEnd) {
      setTimeError('Tanggal/jam mulai dan selesai wajib diisi.')
      return
    }
    createManualEntry.mutate(
      { started_at: new Date(manualStart).toISOString(), ended_at: new Date(manualEnd).toISOString(), note: manualNote.trim() || undefined },
      {
        onSuccess: () => { setManualStart(''); setManualEnd(''); setManualNote('') },
        onError: (err: unknown) => {
          const apiErr = err as { code?: string }
          setTimeError(
            apiErr.code === 'TIME_ENTRY_OVERLAP'
              ? 'Rentang waktu ini overlap dengan entri yang sudah ada.'
              : 'Gagal menambah entri waktu.',
          )
        },
      },
    )
  }

  const onConfirmReject = () => {
    if (!rejectingId || !rejectNote.trim()) return
    rejectEntry.mutate({ entryId: rejectingId, note: rejectNote.trim() }, { onSuccess: () => { setRejectingId(null); setRejectNote('') } })
  }

  const activePics = task.data?.active_pics ?? []
  const myPendingAck = activePics.find((p) => p.user_id === currentUserId && p.acknowledged_at === null)
  const isCreatorOrActivePic = task.data != null && (task.data.created_by === currentUserId || activePics.some((p) => p.user_id === currentUserId))
  const showCompletenessToggle = task.data?.status_name === 'BACKLOG' && isCreatorOrActivePic
  const predecessors = dependencies.data?.predecessors ?? []
  const successors = dependencies.data?.successors ?? []
  const linkedTaskIds = new Set([taskId, ...predecessors.map((p) => p.task_id), ...successors.map((s) => s.task_id)])
  const depSearchLower = depSearch.trim().toLowerCase()
  const dependencyCandidates = (projectTasks.data ?? [])
    .filter((t) => !linkedTaskIds.has(t.id))
    .filter((t) => !depSearchLower || t.title.toLowerCase().includes(depSearchLower) || (t.task_code ?? '').toLowerCase().includes(depSearchLower))
  const activeBlockers = predecessors.filter((p) => p.status !== 'DONE')
  const depEffectNote =
    activeBlockers.length > 0
      ? `Efek saat ini: task ini ditahan dan hanya boleh berada di BACKLOG atau BLOCKED sampai ${activeBlockers.map((b) => b.task_code ?? b.title).join(', ')} berstatus DONE. Percobaan memindahkan status ditolak dan tercatat di Audit Trail.`
      : 'Efek saat ini: tidak ada pemblokir aktif -- task ini bebas berpindah status.'

  // Status Time Tracking (Phase 4, US-018b) -- sesi aktif = exited_at NULL.
  const sessions = statusSessions.data ?? []
  const activeSession = sessions.find((s) => s.exited_at === null) ?? null
  const activeStatus = statuses.find((s) => s.id === task.data?.status_id)
  const showStartWorkButton = Boolean(activeStatus?.require_start_confirmation) && activeSession != null && activeSession.work_started_at === null

  let queueMs = 0
  let activeMs = 0
  for (const s of sessions) {
    const entered = new Date(s.entered_at).getTime()
    const started = s.work_started_at ? new Date(s.work_started_at).getTime() : null
    const exited = s.exited_at ? new Date(s.exited_at).getTime() : null
    if (started != null) queueMs += started - entered
    if (started != null) activeMs += (exited ?? Date.now()) - started
  }
  const leadMs = sessions.length > 0 ? (sessions[sessions.length - 1].exited_at ? new Date(sessions[sessions.length - 1].exited_at!).getTime() : Date.now()) - new Date(sessions[0].entered_at).getTime() : 0

  // statusTotals (IG-97, WAKTU STATUS "AKUMULASI PER STATUS") -- sesi
  // digabung per status_name, TIDAK direset saat mundur (sama catatan
  // desain "sesi baru diakumulasi ke total").
  const statusTotals = new Map<string, { queueMs: number; activeMs: number; sessionCount: number }>()
  for (const s of sessions) {
    const entered = new Date(s.entered_at).getTime()
    const started = s.work_started_at ? new Date(s.work_started_at).getTime() : null
    const exited = s.exited_at ? new Date(s.exited_at).getTime() : null
    const entry = statusTotals.get(s.status_name) ?? { queueMs: 0, activeMs: 0, sessionCount: 0 }
    entry.sessionCount += 1
    if (started != null) {
      entry.queueMs += started - entered
      entry.activeMs += (exited ?? Date.now()) - started
    }
    statusTotals.set(s.status_name, entry)
  }

  // myActiveEntry -- entri time_entries pending milik user sendiri (untuk
  // gate tombol approve/reject: bukan approver tetap bisa lihat, backend
  // yang menolak kalau bukan AW/PM, sama pola "tampilkan semua, backend
  // yang menegakkan" di seluruh modal ini).
  const timerRunningHere = activeTimer.data != null

  const isOverdue = Boolean(task.data?.due_date && task.data.due_date < new Date().toISOString().slice(0, 10) && task.data.status_name !== 'DONE')
  const loggedHours = (task.data?.logged_minutes ?? 0) / 60
  const isOverEstimate = Boolean(task.data?.estimated_hours && loggedHours > task.data.estimated_hours)

  return (
    <Dialog open={taskId !== null} onOpenChange={(next) => !next && onClose()}>
      {/* max-w-[760px] -- IG-97 susulan, ditemukan user membandingkan
          langsung dengan desain: dialog sebelumnya (680px, header cuma
          judul polos) terasa jauh lebih sempit/gepeng dibanding kanvas
          desain (~720px, header breadcrumb+badge kaya). Header di bawah
          ini menggantikan DialogTitle judul polos dengan breadcrumb
          (sprint · dibuat) + baris badge (status/priority/due/jam/SP/
          regresi) sesuai desain -- data project name TIDAK tersedia di
          modal ini (cuma projectId), jadi breadcrumb dipakai sprint+
          tanggal dibuat sebagai pengganti yang wajar dari data yang
          benar-benar ada, bukan menebak/hardcode. */}
      <DialogContent className="max-w-[760px]">
        <DialogHeader>
          {task.data ? (
            <div className="flex flex-col gap-2.5">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-signal">
                  DETAIL TASK · {task.data.task_code ?? '...'}
                </div>
                <DialogTitle className="mt-1.5">
                  {task.data.is_blocked && <span title="Diblokir -- ada predecessor yang belum selesai">🔒 </span>}
                  {task.data.title}
                </DialogTitle>
                <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-text-dim">
                  {task.data.sprint_name ?? 'Backlog'} · Dibuat {new Date(task.data.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span
                  className="border px-2 py-1 font-mono text-[9px] font-semibold"
                  style={task.data.status_color ? { color: task.data.status_color, borderColor: task.data.status_color } : undefined}
                >
                  {task.data.status_name}
                </span>
                <span className={cn('border px-2 py-1 font-mono text-[9px] font-semibold uppercase', PRIORITY_BADGE_TONE[task.data.priority])}>
                  {task.data.priority}
                </span>
                <span className={cn('border px-2 py-1 font-mono text-[9px]', isOverdue ? 'border-destructive text-destructive' : 'border-line-strong text-text-muted')}>
                  DUE {task.data.due_date ?? '—'}
                </span>
                <span className={cn('border px-2 py-1 font-mono text-[9px]', isOverEstimate ? 'border-destructive text-destructive' : 'border-line-strong text-text-muted')}>
                  {loggedHours.toFixed(1)}/{task.data.estimated_hours ?? '—'} JAM
                </span>
                <span className="border border-violet px-2 py-1 font-mono text-[9px] font-semibold text-violet">
                  SP {task.data.story_points ?? '?'}
                </span>
                {task.data.regression_count > 0 && (
                  <span className="border border-destructive bg-destructive/10 px-2 py-1 font-mono text-[9px] font-semibold text-destructive">
                    ↩ {task.data.regression_count}× REGRESI
                  </span>
                )}
              </div>
            </div>
          ) : (
            <DialogTitle>Detail Task</DialogTitle>
          )}
        </DialogHeader>

        {task.isLoading && <p className="px-5 py-5 text-sm text-text-muted">Memuat...</p>}

        {task.data && (
          <>
            <div className="flex gap-1 overflow-x-auto border-b border-line px-5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={cn(
                    'whitespace-nowrap border-b-2 px-2.5 py-2.5 font-mono text-[9.5px] tracking-[0.1em]',
                    activeTab === t.key ? 'border-signal text-text-bone' : 'border-transparent text-text-dim hover:text-text-muted',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex h-[560px] max-h-[calc(100vh-340px)] flex-col gap-4 overflow-y-auto px-5 py-5">
              {activeTab === 'overview' && (
                <>
                  {/* JUDUL TASK + DESKRIPSI -- baris info konten di paling
                      atas RINGKASAN (susulan 2026-09-24, diminta user).
                      Satu-satunya tempat deskripsi ditampilkan baca-saja
                      sekarang -- blok DESKRIPSI terpisah yang dulu ada di
                      antara FIELD TASK dan SUB-TASK dihapus (redundan). */}
                  <div>
                    <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">JUDUL TASK</div>
                    <div className="mt-1.5 text-[13px] font-semibold text-text-bone">{task.data.title}</div>
                    <div className="mt-2.5 font-mono text-[8.5px] tracking-[0.14em] text-text-dim">DESKRIPSI</div>
                    <div className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-text-bone">
                      {description || <span className="text-text-dim">Belum ada deskripsi.</span>}
                    </div>
                  </div>

                  {/* fields -- ringkasan cepat baca-saja (desain: ASSIGNEE/
                      PIC FASE/STORY POINT/SPRINT/JAM TERCATAT). Status/
                      priority/due/SP SUDAH ada di badge header, tidak
                      diulang di sini. */}
                  <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                    <div>
                      <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">ASSIGNEE</div>
                      <div className="mt-1.5 text-[12.5px] text-text-bone">
                        {task.data.assignees.length ? task.data.assignees.map((a) => a.display_name || a.email).join(', ') : <span className="text-text-dim">Belum ada assignee</span>}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">PIC FASE</div>
                      <div className="mt-1.5 text-[12.5px] text-text-bone">
                        {activePics.length ? activePics.map((p) => p.user_name || p.user_email).join(', ') : <span className="text-text-dim">Belum ada PIC</span>}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">STORY POINT</div>
                      <div className="mt-1.5 text-[12.5px] text-text-bone">{task.data.story_points == null ? '? · belum diestimasi' : `${task.data.story_points} SP`}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">SPRINT</div>
                      <div className="mt-1.5 text-[12.5px] text-text-bone">{task.data.sprint_name ?? 'Backlog'}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">JAM TERCATAT</div>
                      <div className={cn('mt-1.5 text-[12.5px]', isOverEstimate ? 'text-destructive' : 'text-text-bone')}>
                        {loggedHours.toFixed(1)} dari {task.data.estimated_hours ?? '—'} jam{isOverEstimate ? ' · melebihi estimasi' : ''}
                      </div>
                    </div>
                  </div>

                  {/* FIELD TASK -- kotak edit collapsible (desain: header
                      "FIELD TASK" + toggle "EDIT FIELD"/"TUTUP EDITOR",
                      kosong saat tidak sedang diedit). DESKRIPSI DISATUKAN
                      di sini (susulan 2026-09-24, diminta user "supaya
                      tidak terlalu banyak tombol simpan" -- desain aslinya
                      memisah DESKRIPSI jadi tombol simpan sendiri). Sprint
                      TIDAK diedit di sini (belum ada picker sprint di form
                      ini sebelumnya) -- simplifikasi diterima. */}
                  <div className="border border-line-strong bg-input-bg p-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[8.5px] tracking-[0.14em] text-signal">FIELD TASK</span>
                      <button
                        type="button"
                        onClick={() => (fieldEditing ? handleCancelField() : setFieldEditing(true))}
                        className="ml-auto font-mono text-[9px] uppercase tracking-[0.06em] text-signal hover:underline"
                      >
                        {fieldEditing ? '✕ Tutup Editor' : '✎ Edit Field'}
                      </button>
                    </div>
                    {fieldEditing && (
                      <div className="mt-3.5 flex flex-col gap-3.5">
                        <div>
                          <label className="mb-1.5 block font-mono text-[8.5px] tracking-[0.14em] text-text-dim">JUDUL TASK</label>
                          <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full border border-line-strong bg-panel px-3 py-2.5 text-[13px] text-text-bone outline-none focus-visible:border-signal"
                          />
                        </div>
                        <div>
                          <div className="mb-1.5 flex items-baseline gap-2.5">
                            <label className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">DESKRIPSI</label>
                            {versions.data && versions.data.length > 0 && (
                              <span className="ml-auto font-mono text-[9px] text-text-dim">
                                versi terakhir v{versions.data.length} · {versions.data[0].changed_by_name || versions.data[0].changed_by_email}
                              </span>
                            )}
                          </div>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Cakupan, langkah verifikasi, tautan dokumen…"
                            className="h-[100px] w-full resize-y border border-line-strong bg-panel px-3 py-2.5 text-[13px] leading-relaxed text-text-bone outline-none focus-visible:border-signal"
                          />
                        </div>
                        <div className="flex flex-wrap gap-3.5">
                          <div className="min-w-[180px] flex-1">
                            <label className="mb-2 block font-mono text-[8.5px] tracking-[0.14em] text-text-dim">PRIORITY</label>
                            <div className="flex flex-wrap gap-1.5">
                              {PRIORITIES.map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setPriority(p)}
                                  className={cn(
                                    'border px-2.5 py-1.5 font-mono text-[9.5px] font-semibold uppercase',
                                    priority === p ? 'border-signal bg-signal/10 text-signal' : 'border-line-strong text-text-muted',
                                  )}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="w-[160px]">
                            <label className="mb-2 block font-mono text-[8.5px] tracking-[0.14em] text-text-dim">DUE DATE</label>
                            <input
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="w-full border border-line-strong bg-panel px-2.5 py-2 font-mono text-[11px] text-text-bone outline-none focus-visible:border-signal"
                            />
                          </div>
                          <div className="w-[130px]">
                            <label className="mb-2 block font-mono text-[8.5px] tracking-[0.14em] text-text-dim">ESTIMASI (JAM)</label>
                            <input
                              value={estimatedHours}
                              onChange={(e) => setEstimatedHours(e.target.value.replace(/[^0-9.]/g, ''))}
                              className="w-full border border-line-strong bg-panel px-2.5 py-2 font-mono text-[11px] text-text-bone outline-none focus-visible:border-signal"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-2 block font-mono text-[8.5px] tracking-[0.14em] text-text-dim">STORY POINT · SKALA FIBONACCI</label>
                          <div className="flex flex-wrap gap-1.5">
                            {[null, ...FIBONACCI_STORY_POINTS].map((v) => (
                              <button
                                key={v ?? 'unset'}
                                type="button"
                                onClick={() => setStoryPoints(v)}
                                className={cn(
                                  'min-w-[32px] border px-2 py-1.5 text-center font-mono text-[10.5px] font-semibold',
                                  storyPoints === v ? 'border-signal bg-signal/10 text-signal' : 'border-line-strong text-text-muted',
                                )}
                              >
                                {v ?? '?'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={onSaveField}
                            disabled={update.isPending}
                            className="border border-signal bg-signal px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-bg-deep disabled:opacity-40"
                          >
                            {update.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                          </button>
                          <button type="button" onClick={handleCancelField} className="border border-line-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.06em] text-text-muted">
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SUB-TASK -- checklist ringan (IG-97 susulan, diminta
                      user "kenapa sub-task belum ada?"). Tabel baru RINGAN
                      task_checklist_items -- BUKAN reuse tasks.parent_task_id,
                      supaya tidak memaksa checklist item lewat mesin Task
                      penuh (assignee wajib, PIC per pindah status). */}
                  <div>
                    <div className="mb-2 flex items-baseline gap-2.5">
                      <span className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">SUB-TASK</span>
                      <span className="ml-auto font-mono text-[9px] text-text-muted">
                        {(checklistItems.data ?? []).filter((i) => i.is_done).length} dari {(checklistItems.data ?? []).length} selesai
                      </span>
                    </div>
                    {(checklistItems.data ?? []).length > 0 && (
                      <div className="mb-3 h-2 bg-input-bg">
                        <div
                          className="h-full bg-mint"
                          style={{
                            width: `${((checklistItems.data ?? []).filter((i) => i.is_done).length / Math.max(1, (checklistItems.data ?? []).length)) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      {(checklistItems.data ?? []).map((item) => (
                        <div key={item.id} className="flex items-center gap-2.5 border border-line-strong bg-input-bg p-2.5">
                          <button
                            type="button"
                            onClick={() => updateChecklistItem.mutate({ itemId: item.id, values: { is_done: !item.is_done } })}
                            className={cn(
                              'flex h-4 w-4 flex-shrink-0 items-center justify-center border font-mono text-[10px]',
                              item.is_done ? 'border-mint bg-mint text-bg-deep' : 'border-line-strong text-transparent',
                            )}
                          >
                            ✓
                          </button>
                          {editingSubtaskId === item.id ? (
                            <>
                              <input
                                value={subtaskDraft}
                                onChange={(e) => setSubtaskDraft(e.target.value)}
                                className="min-w-0 flex-1 border border-line-strong bg-panel px-2 py-1 text-[12.5px] text-text-bone outline-none focus-visible:border-signal"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const trimmed = subtaskDraft.trim()
                                  if (!trimmed) return
                                  updateChecklistItem.mutate({ itemId: item.id, values: { title: trimmed } }, { onSuccess: () => setEditingSubtaskId(null) })
                                }}
                                className="font-mono text-[9px] uppercase text-signal hover:underline"
                              >
                                Simpan
                              </button>
                              <button type="button" onClick={() => setEditingSubtaskId(null)} className="font-mono text-[9px] uppercase text-text-muted hover:underline">
                                Batal
                              </button>
                            </>
                          ) : (
                            <>
                              <span className={cn('min-w-0 flex-1 text-[12.5px]', item.is_done ? 'text-text-dim line-through' : 'text-text-bone')}>{item.title}</span>
                              <button
                                type="button"
                                onClick={() => { setEditingSubtaskId(item.id); setSubtaskDraft(item.title) }}
                                className="font-mono text-[9px] uppercase text-text-muted hover:text-signal"
                              >
                                ✎ Ubah
                              </button>
                              <button type="button" onClick={() => deleteChecklistItem.mutate(item.id)} className="font-mono text-[9px] text-destructive hover:underline">
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <input
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="Tambah sub-task baru"
                        className="min-w-[220px] flex-1 border border-line-strong bg-input-bg px-3 py-2 text-[12.5px] text-text-bone outline-none focus-visible:border-signal"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newSubtaskTitle.trim()
                          if (!trimmed) return
                          createChecklistItem.mutate(trimmed, { onSuccess: () => setNewSubtaskTitle('') })
                        }}
                        disabled={!newSubtaskTitle.trim() || createChecklistItem.isPending}
                        className="border border-signal px-4 py-2 font-mono text-[10px] uppercase tracking-[0.06em] text-signal disabled:opacity-40"
                      >
                        + Sub-task
                      </button>
                    </div>
                  </div>

                  {showStartWorkButton && (
                    <Button
                      type="button"
                      onClick={() => startWork.mutate()}
                      disabled={startWork.isPending}
                      className="w-fit font-mono text-[9.5px] font-bold uppercase tracking-[0.06em]"
                    >
                      ▶ Mulai Pengerjaan
                    </Button>
                  )}

                  <div>
                    <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">KELENGKAPAN</div>
                    {showCompletenessToggle ? (
                      <button
                        type="button"
                        onClick={() =>
                          setCompleteness.mutate({
                            taskId,
                            completeness: task.data!.completeness === 'complete' ? 'incomplete' : 'complete',
                          })
                        }
                        disabled={setCompleteness.isPending}
                        className={cn(
                          'mt-1.5 border px-2.5 py-1.5 font-mono text-[10.5px] font-semibold',
                          task.data.completeness === 'complete' ? 'border-mint text-mint' : 'border-amber text-amber',
                        )}
                      >
                        {task.data.completeness === 'complete' ? '✓ Lengkap' : '○ Belum Lengkap'}
                      </button>
                    ) : (
                      <div className="mt-1.5 text-[12.5px] text-text-bone">{task.data.completeness === 'complete' ? 'Lengkap' : 'Belum Lengkap'}</div>
                    )}
                  </div>

                  {/* PINDAHKAN STATUS -- di desain letaknya di paling
                      bawah tab RINGKASAN (setelah field/deskripsi/sub-task),
                      bukan di atas. */}
                  <div className="border-t border-line pt-4">
                    <label className="mb-2 block font-mono text-[8.5px] tracking-[0.14em] text-text-dim">PINDAHKAN STATUS</label>
                    <div className="flex flex-wrap gap-1.5">
                      {statuses.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          disabled={s.is_undefined}
                          onClick={() => openPicPicker(s.id)}
                          className={cn(
                            'border px-2.5 py-1.5 font-mono text-[9.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40',
                            s.id === task.data.status_id ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted hover:text-text-bone',
                          )}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>

                    {pendingStatusId && (
                      <div className="mt-3 border border-amber bg-amber/5 p-3">
                        <div className="mb-2 font-mono text-[8.5px] tracking-[0.14em] text-amber">PILIH PIC FASE</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(members.data ?? []).map((m) => {
                            const on = picSelection.includes(m.user_id)
                            return (
                              <button
                                key={m.user_id}
                                type="button"
                                onClick={() => togglePic(m.user_id)}
                                className={cn(
                                  'border px-2.5 py-1.5 font-mono text-[9.5px]',
                                  on ? 'border-mint bg-mint/10 text-mint' : 'border-line-strong text-text-muted',
                                )}
                              >
                                {on ? '● ' : ''}
                                {m.display_name || m.email}
                              </button>
                            )
                          })}
                        </div>
                        {picError && <p className="mt-2 text-[10px] text-destructive">⚠ {picError}</p>}
                        <div className="mt-2.5 flex gap-2">
                          <button
                            type="button"
                            onClick={onConfirmMove}
                            disabled={setStatus.isPending}
                            className="border border-amber px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase text-amber"
                          >
                            Pindahkan &amp; Tetapkan PIC
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingStatusId(null)}
                            className="border border-line-strong px-3 py-1.5 font-mono text-[9.5px] uppercase text-text-muted"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'deps' && (
                <div className="flex flex-col gap-4">
                  <p className="font-mono text-[9.5px] leading-relaxed text-text-dim">
                    Dependency Finish-to-Start: task yang memblokir harus DONE sebelum task ini boleh masuk status berjalan. Rule automation dan Gantt memakai keterkaitan yang sama. Keterkaitan yang membentuk lingkaran ditolak sistem dan dicatat di Audit Trail.
                  </p>

                  <div className="flex flex-col gap-2">
                    {predecessors.map((p) => (
                      <div key={p.task_id} className="flex items-center gap-3 border border-line-strong bg-input-bg p-2.5">
                        <span className={cn('flex-shrink-0 whitespace-nowrap border px-2 py-0.5 font-mono text-[9px] tracking-[0.06em]', p.status === 'DONE' ? 'border-mint text-mint' : 'border-destructive text-destructive')}>
                          {p.status === 'DONE' ? 'SUDAH DONE' : 'MENAHAN'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12.5px] text-text-bone">{p.task_code ?? '—'} · {p.title}</div>
                          <div className="font-mono text-[9px] text-text-dim">Finish-to-Start · status {p.status}</div>
                        </div>
                        <button type="button" onClick={() => removeDependency.mutate({ taskId, predecessorTaskId: p.task_id })} className="flex-shrink-0 font-mono text-[9px] uppercase tracking-[0.06em] text-destructive hover:underline">
                          ✕ Hapus
                        </button>
                      </div>
                    ))}
                    {successors.map((s) => (
                      <div key={s.task_id} className="flex items-center gap-3 border border-line-strong bg-input-bg p-2.5">
                        <span className="flex-shrink-0 whitespace-nowrap border border-blue px-2 py-0.5 font-mono text-[9px] tracking-[0.06em] text-blue">MEMBLOKIR</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12.5px] text-text-bone">{s.task_code ?? '—'} · {s.title}</div>
                          <div className="font-mono text-[9px] text-text-dim">Finish-to-Start · status {s.status} · task ini harus DONE sebelum {s.task_code ?? s.title} berjalan</div>
                        </div>
                        <span className="flex-shrink-0 font-mono text-[9px] text-text-dim">—</span>
                      </div>
                    ))}
                    {predecessors.length === 0 && successors.length === 0 && <p className="font-mono text-[9.5px] text-text-dim">Belum ada dependency pada task ini.</p>}
                  </div>

                  <div className="border border-line-strong bg-input-bg p-3 font-mono text-[9.5px] leading-relaxed text-text-muted">{depEffectNote}</div>

                  <div className="border-t border-line pt-4">
                    <label className="mb-2 block font-mono text-[8.5px] tracking-[0.14em] text-text-dim">TAMBAH DEPENDENCY</label>
                    <input
                      value={depSearch}
                      onChange={(e) => { setDepSearch(e.target.value); setDepError('') }}
                      placeholder="Cari task lain di project ini"
                      className="w-full border border-line-strong bg-input-bg px-3 py-2 text-[12.5px] text-text-bone outline-none focus-visible:border-signal"
                    />
                    {depError && <p className="mt-2 text-[10px] text-destructive">⚠ {depError}</p>}
                    <div className="mt-2.5 flex max-h-[160px] flex-col gap-1.5 overflow-y-auto">
                      {dependencyCandidates.map((t) => (
                        <div key={t.id} className="flex items-center gap-2.5 border border-line-strong p-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] text-text-bone">{t.task_code ?? '—'} · {t.title}</div>
                            <div className="font-mono text-[9px] text-text-dim">{t.status_name} · {t.priority}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onAddDependency(t.id)}
                            disabled={addDependency.isPending}
                            className="flex-shrink-0 whitespace-nowrap border border-amber px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-amber disabled:opacity-40"
                          >
                            Menunggu Ini
                          </button>
                        </div>
                      ))}
                      {dependencyCandidates.length === 0 && (
                        <p className="font-mono text-[9.5px] text-text-dim">{depSearch ? 'Tidak ada task yang cocok.' : 'Tidak ada task lain yang tersedia di project ini.'}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pic' && (
                <>
                  <div>
                    <div className="mb-2 font-mono text-[9px] tracking-[0.14em] text-text-dim">ASSIGNEE</div>
                    <div className="flex flex-wrap gap-1.5">
                      {task.data.assignees.map((a) => (
                        <span key={a.user_id} className="border border-line-strong px-2.5 py-1.5 font-mono text-[9.5px] text-text-muted">
                          {a.display_name || a.email} <span className="text-text-dim">· {a.role}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[9px] tracking-[0.14em] text-text-dim">PIC AKTIF</span>
                      <button type="button" onClick={() => setHistoryOpen((v) => !v)} className="font-mono text-[9px] text-text-muted hover:text-signal">
                        {historyOpen ? '▴ Tutup riwayat' : '▾ Riwayat PIC'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activePics.map((p) => (
                        <span
                          key={p.id}
                          className={cn(
                            'border px-2.5 py-1.5 font-mono text-[9.5px]',
                            p.acknowledged_at ? 'border-mint text-mint' : 'border-amber text-amber',
                          )}
                        >
                          {p.user_name || p.user_email} · {p.acknowledged_at ? 'AKTIF' : 'PENDING'}
                        </span>
                      ))}
                      {activePics.length === 0 && <span className="font-mono text-[9.5px] text-text-dim">Tidak ada PIC aktif.</span>}
                    </div>
                    {myPendingAck && (
                      <Button
                        type="button"
                        onClick={() => acknowledge.mutate(undefined, { onSuccess: () => setNotice('Serah terima PIC dikonfirmasi.') })}
                        disabled={acknowledge.isPending}
                        className="mt-2.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.06em]"
                      >
                        ✓ Konfirmasi Serah Terima PIC
                      </Button>
                    )}
                    {historyOpen && (
                      <div className="mt-2.5 flex flex-col gap-1.5 border-t border-line pt-2.5">
                        {(picHistory.data ?? []).map((p) => (
                          <div key={p.id} className="flex items-center justify-between font-mono text-[9px] text-text-muted">
                            <span>{p.status_name} · {p.user_name || p.user_email}</span>
                            <span className={p.is_active ? 'text-mint' : 'text-text-dim'}>
                              {p.acknowledged_at ? 'Acknowledged' : p.is_active ? 'Pending' : 'Non-aktif'}
                            </span>
                          </div>
                        ))}
                        {(picHistory.data ?? []).length === 0 && <p className="font-mono text-[9px] text-text-dim">Belum ada riwayat.</p>}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'attach' && (
                <div>
                  <div className="mb-2 font-mono text-[9px] tracking-[0.14em] text-text-dim">LAMPIRAN</div>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(false)
                      handleUpload(e.dataTransfer.files[0])
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'cursor-pointer border border-dashed p-4 text-center font-mono text-[10px] text-text-muted',
                      dragOver ? 'border-signal bg-signal/5' : 'border-line-strong',
                    )}
                  >
                    Seret &amp; lepas file, atau <span className="text-signal">pilih file</span>
                    <div className="mt-1.5 text-[8.5px] leading-relaxed text-text-dim">
                      Maks 50 MB per file. Diizinkan: jpg png gif webp svg · pdf doc docx xls xlsx ppt pptx txt md csv · zip rar 7z · json xml
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        handleUpload(e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                  </div>
                  {uploadAttachment.isPending && <p className="mt-1.5 font-mono text-[9.5px] text-text-muted">Mengunggah...</p>}
                  {attachError && <p className="mt-1.5 font-mono text-[10px] text-destructive">⚠ {attachError}</p>}

                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {(attachments.data ?? []).map((a) => {
                      const isOwner = a.uploader_id === currentUserId
                      const isRenaming = renamingId === a.id
                      const isConfirmingDelete = deleteConfirmId === a.id
                      return (
                        <div key={a.id} className="border border-line-strong p-2.5">
                          {isRenaming ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                className="flex-1 border border-line-strong bg-input-bg px-2 py-1 text-[11px] text-text-bone outline-none focus-visible:border-signal"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  renameAttachment.mutate(
                                    { id: a.id, displayName: renameDraft },
                                    { onSuccess: () => setRenamingId(null) },
                                  )
                                }
                                disabled={renameAttachment.isPending || renameDraft.trim() === ''}
                                className="border border-signal px-2 py-1 font-mono text-[9px] font-bold uppercase text-signal disabled:opacity-40"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => setRenamingId(null)}
                                className="border border-line-strong px-2 py-1 font-mono text-[9px] uppercase text-text-muted"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[12px] text-text-bone">{a.display_name}</div>
                                <div className="font-mono text-[9px] text-text-dim">
                                  {formatBytes(a.size_bytes)} · {a.uploader_name || a.uploader_email} · {new Date(a.created_at).toLocaleDateString('id-ID')}
                                </div>
                              </div>
                              <div className="flex flex-shrink-0 items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => onDownloadAttachment(a.id, a.display_name)}
                                  className="font-mono text-[9.5px] text-signal hover:underline"
                                >
                                  Unduh
                                </button>
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => { setRenamingId(a.id); setRenameDraft(a.display_name) }}
                                    className="font-mono text-[9.5px] text-text-muted hover:text-signal"
                                  >
                                    Rename
                                  </button>
                                )}
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(a.id)}
                                    className="font-mono text-[9.5px] text-destructive hover:underline"
                                  >
                                    Hapus
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                          {isConfirmingDelete && (
                            <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
                              <span className="font-mono text-[9.5px] text-amber">Hapus lampiran ini?</span>
                              <button
                                type="button"
                                onClick={() => deleteAttachmentMut.mutate(a.id, { onSuccess: () => setDeleteConfirmId(null) })}
                                disabled={deleteAttachmentMut.isPending}
                                className="border border-destructive px-2 py-1 font-mono text-[9px] font-bold uppercase text-destructive"
                              >
                                Ya, Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="border border-line-strong px-2 py-1 font-mono text-[9px] uppercase text-text-muted"
                              >
                                Batal
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {(attachments.data ?? []).length === 0 && <p className="font-mono text-[9.5px] text-text-dim">Belum ada lampiran.</p>}
                  </div>
                </div>
              )}

              {activeTab === 'time' && (
                <div className="flex flex-col gap-5">
                  <div>
                    <div className="mb-2 font-mono text-[9px] tracking-[0.14em] text-text-dim">STATUS TIME TRACKING</div>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                      <div className="border border-line-strong p-2 text-center">
                        <div className="text-[8px] text-text-dim">QUEUE TIME</div>
                        <div className="mt-1 text-text-bone">{formatDuration(queueMs)}</div>
                      </div>
                      <div className="border border-line-strong p-2 text-center">
                        <div className="text-[8px] text-text-dim">ACTIVE TIME</div>
                        <div className="mt-1 text-text-bone">{formatDuration(activeMs)}</div>
                      </div>
                      <div className="border border-line-strong p-2 text-center">
                        <div className="text-[8px] text-text-dim">LEAD TIME</div>
                        <div className="mt-1 text-text-bone">{formatDuration(leadMs)}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 font-mono text-[8.5px] tracking-[0.14em] text-text-dim">AKUMULASI PER STATUS · SESI DIGABUNG, TIDAK DIRESET SAAT MUNDUR</div>
                    <div className="flex flex-col gap-1.5">
                      {Array.from(statusTotals.entries()).map(([statusName, t]) => (
                        <div key={statusName} className="flex flex-wrap items-center gap-2.5 border border-line-strong p-2 font-mono text-[9px]">
                          <span className="border border-line-strong px-2 py-0.5 font-semibold text-text-bone">{statusName}</span>
                          <span className="text-text-dim">{t.sessionCount} sesi</span>
                          <span className="ml-auto text-amber">QUEUE {formatDuration(t.queueMs)}</span>
                          <span className="text-mint">ACTIVE {formatDuration(t.activeMs)}</span>
                        </div>
                      ))}
                      {statusTotals.size === 0 && <p className="font-mono text-[9px] text-text-dim">Belum ada sesi status.</p>}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 font-mono text-[8.5px] tracking-[0.14em] text-text-dim">TIMELINE SESI · KRONOLOGIS</div>
                    <div className="flex flex-col gap-1">
                      {sessions.map((s) => (
                        <div key={s.id} className="flex items-center justify-between font-mono text-[9px] text-text-muted">
                          <span>
                            {s.status_name} #{s.session_no}
                            {s.is_regression && <span className="ml-1 text-amber">↩ regresi</span>}
                            {s.is_auto_start && <span className="ml-1 text-text-dim" title="Mulai pengerjaan diisi otomatis (tidak diklik manual)">⏱ auto</span>}
                          </span>
                          <span className="text-text-dim">{s.exited_at ? 'Selesai' : 'Aktif'}</span>
                        </div>
                      ))}
                      {sessions.length === 0 && <p className="font-mono text-[9px] text-text-dim">Belum ada sesi.</p>}
                    </div>
                  </div>

                  <div className="border-t border-line pt-4">
                    <div className="mb-1 font-mono text-[8.5px] tracking-[0.14em] text-text-dim">CATATAN WAKTU (TIMESHEET)</div>
                    <p className="mb-2.5 font-mono text-[9px] leading-relaxed text-text-dim">
                      Jam kerja yang dicatat manusia (start/stop timer atau entri manual) -- beda dari Status Time Tracking di atas yang murni mengukur berapa lama task duduk di tiap status. Entri manual butuh approval AW/PM.
                    </p>
                    <div className="flex items-center gap-2.5">
                      {timerRunningHere ? (
                        <Button
                          type="button"
                          onClick={() => stopTimer.mutate()}
                          disabled={stopTimer.isPending}
                          className="border-destructive bg-transparent font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-destructive hover:bg-destructive/10"
                        >
                          ■ Hentikan Timer
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => startTimer.mutate()}
                          disabled={startTimer.isPending}
                          className="font-mono text-[9.5px] font-bold uppercase tracking-[0.06em]"
                        >
                          ▶ Mulai Timer
                        </Button>
                      )}
                      {timerRunningHere && activeTimer.data && (
                        <span className="font-mono text-[10px] text-mint">{formatDuration(activeTimer.data.elapsed_seconds * 1000)} berjalan</span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <div>
                        <label className="mb-1 block font-mono text-[8.5px] text-text-dim">MULAI</label>
                        <input
                          type="datetime-local"
                          value={manualStart}
                          onChange={(e) => setManualStart(e.target.value)}
                          className="border border-line-strong bg-input-bg px-2 py-1.5 font-mono text-[10px] text-text-bone outline-none focus-visible:border-signal"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-mono text-[8.5px] text-text-dim">SELESAI</label>
                        <input
                          type="datetime-local"
                          value={manualEnd}
                          onChange={(e) => setManualEnd(e.target.value)}
                          className="border border-line-strong bg-input-bg px-2 py-1.5 font-mono text-[10px] text-text-bone outline-none focus-visible:border-signal"
                        />
                      </div>
                      <input
                        value={manualNote}
                        onChange={(e) => setManualNote(e.target.value)}
                        placeholder="Catatan (opsional)"
                        className="min-w-[160px] flex-1 border border-line-strong bg-input-bg px-2 py-1.5 text-[11px] text-text-bone outline-none focus-visible:border-signal"
                      />
                      <button
                        type="button"
                        onClick={onCreateManualEntry}
                        disabled={createManualEntry.isPending}
                        className="border border-signal px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase text-signal disabled:opacity-40"
                      >
                        + Entri Manual
                      </button>
                    </div>
                    {timeError && <p className="mt-1.5 font-mono text-[9.5px] text-destructive">⚠ {timeError}</p>}

                    <div className="mt-3 flex flex-col gap-1.5">
                      {(timeEntries.data?.items ?? []).map((e) => (
                        <div key={e.id} className="flex flex-wrap items-center gap-2 border border-line-strong p-2 font-mono text-[9.5px]">
                          <span className="text-text-bone">{e.user.display_name || e.user.email}</span>
                          <span className="text-text-dim">
                            {new Date(e.started_at).toLocaleString('id-ID')} · {e.duration_minutes != null ? (e.duration_minutes / 60).toFixed(1) : '—'} jam
                          </span>
                          <span className={cn('border px-1.5 py-0.5 text-[8.5px] uppercase', e.approval_status === 'approved' ? 'border-mint text-mint' : e.approval_status === 'rejected' ? 'border-destructive text-destructive' : 'border-amber text-amber')}>
                            {e.approval_status}
                          </span>
                          {e.approval_status === 'pending' && (
                            <div className="ml-auto flex gap-1.5">
                              <button type="button" onClick={() => approveEntry.mutate(e.id)} className="text-mint hover:underline">✓ Approve</button>
                              <button type="button" onClick={() => { setRejectingId(e.id); setRejectNote('') }} className="text-destructive hover:underline">✕ Tolak</button>
                            </div>
                          )}
                          {rejectingId === e.id && (
                            <div className="mt-2 flex w-full items-center gap-1.5">
                              <input
                                value={rejectNote}
                                onChange={(ev) => setRejectNote(ev.target.value)}
                                placeholder="Alasan penolakan..."
                                className="flex-1 border border-line-strong bg-input-bg px-2 py-1 text-[10.5px] text-text-bone outline-none focus-visible:border-signal"
                              />
                              <button type="button" onClick={onConfirmReject} disabled={!rejectNote.trim() || rejectEntry.isPending} className="border border-destructive px-2 py-1 text-[9px] uppercase text-destructive disabled:opacity-40">
                                Kirim
                              </button>
                              <button type="button" onClick={() => setRejectingId(null)} className="border border-line-strong px-2 py-1 text-[9px] uppercase text-text-muted">
                                Batal
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {(timeEntries.data?.items ?? []).length === 0 && <p className="font-mono text-[9px] text-text-dim">Belum ada entri waktu.</p>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'versions' && (
                <div>
                  <p className="mb-3 font-mono text-[9.5px] leading-relaxed text-text-dim">
                    Setiap perubahan judul/deskripsi membuat snapshot baru. Versi lama tetap tersimpan (baca-saja, tidak bisa dipulihkan).
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {(versions.data ?? []).map((v, i) => (
                      <div key={v.id} className="border border-line-strong bg-input-bg p-3">
                        <div className="flex flex-wrap items-baseline gap-2.5">
                          <span className="font-mono text-[9.5px] font-semibold text-signal">v{(versions.data?.length ?? 0) - i}</span>
                          <span className="font-mono text-[9px] text-text-dim">
                            {v.changed_by_name || v.changed_by_email} · {new Date(v.snapshot_at).toLocaleString('id-ID')}
                          </span>
                          <span className="ml-auto font-mono text-[9px] text-text-muted">{v.trigger}</span>
                        </div>
                        <div className="mt-2 text-[12px] font-semibold text-text-bone">{v.title}</div>
                        {typeof v.description === 'string' && v.description && (
                          <div className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-text-muted">{v.description}</div>
                        )}
                      </div>
                    ))}
                    {(versions.data ?? []).length === 0 && <p className="font-mono text-[9.5px] text-text-dim">Belum ada riwayat versi -- versi baru dibuat saat judul/deskripsi diedit.</p>}
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div>
                  <div className="flex flex-col gap-2">
                    {(activity.data?.items ?? []).map((a) => (
                      <div key={a.id} className="flex gap-2.5 border border-line-strong bg-input-bg p-3">
                        <span className="h-fit flex-shrink-0 border border-line-strong px-2 py-0.5 font-mono text-[8.5px] uppercase text-text-muted">
                          {a.action.split('.')[1]?.replace(/_/g, ' ') ?? a.action}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] text-text-bone">{describeTaskAction(a.action, a.state_before, a.state_after, a.metadata)}</div>
                          <div className="mt-1 font-mono text-[9px] text-text-dim">
                            {a.actor_name || a.actor_email || 'Sistem'} {a.actor_role ? `· ${a.actor_role}` : ''} · {new Date(a.logged_at).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(activity.data?.items ?? []).length === 0 && (
                      <p className="font-mono text-[9.5px] leading-relaxed text-text-dim">
                        Belum ada aktivitas tercatat untuk task ini. Perubahan status, role, lampiran, dan dependency akan muncul di sini.
                      </p>
                    )}
                  </div>
                  {(activity.data?.total ?? 0) > 10 && (
                    <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 font-mono text-[9.5px]">
                      <span className="text-text-dim">Halaman {activityPage} dari {Math.ceil((activity.data?.total ?? 0) / 10)}</span>
                      <button
                        type="button"
                        onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                        disabled={activityPage <= 1}
                        className="ml-auto border border-line-strong px-2.5 py-1 uppercase text-text-muted disabled:opacity-30"
                      >
                        ◄ Sblm
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivityPage((p) => (p * 10 < (activity.data?.total ?? 0) ? p + 1 : p))}
                        disabled={activityPage * 10 >= (activity.data?.total ?? 0)}
                        className="border border-line-strong px-2.5 py-1 uppercase text-text-muted disabled:opacity-30"
                      >
                        Brkt ►
                      </button>
                    </div>
                  )}
                </div>
              )}

              {fieldDirty && (
                <p className="border border-amber p-2.5 font-mono text-[10px] leading-relaxed text-amber">
                  Ada perubahan yang belum disimpan di tab RINGKASAN.
                </p>
              )}
              {!fieldDirty && notice && <p className="border border-mint p-2.5 font-mono text-[10px] text-mint">✓ {notice}</p>}
              {saveError && <p className="text-[11px] text-destructive">⚠ {saveError}</p>}
            </div>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDelete} disabled={remove.isPending} className="border-destructive font-mono text-[10px] uppercase tracking-[0.06em] text-destructive">
            Hapus
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
