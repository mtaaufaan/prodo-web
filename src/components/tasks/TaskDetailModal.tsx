import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadAttachment } from '@/features/attachments/api'
import { useDeleteAttachment, useDocumentsQuota, useRenameAttachment, useTaskAttachments, useUploadAttachment } from '@/features/attachments/hooks'
import { ALLOWED_EXTENSIONS, MAX_ATTACHMENT_SIZE_BYTES, fileExt, formatBytes } from '@/features/attachments/types'
import { useProjectMembers } from '@/features/project-members/hooks'
import {
  useAcknowledgePic,
  useActiveTimer,
  useAddDependency,
  useAddPic,
  useApproveTimeEntry,
  useCreateChecklistItem,
  useCreateManualTimeEntry,
  useDeleteChecklistItem,
  useDeleteTask,
  useHandoffPic,
  usePicHistory,
  useProjectSprints,
  useProjectTasks,
  useRejectTimeEntry,
  useRemoveDependency,
  useRemovePic,
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
import { FIBONACCI_STORY_POINTS, statusColorClasses, type CustomStatus, type TaskPriority } from '@/features/tasks/types'
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
    case 'task.pic_added':
      return `PIC paralel ditambahkan pada fase ${(metadata as { status_name?: string } | null)?.status_name ?? '—'}`
    case 'task.pic_removed':
      return `PIC dihapus dari fase ${(metadata as { status_name?: string } | null)?.status_name ?? '—'}`
    case 'task.pic_handoff':
      return `PIC fase ${(metadata as { status_name?: string } | null)?.status_name ?? '—'} diserahterimakan`
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

// activityTypeMeta -- IG-97 susulan, badge kategori tab AKTIVITAS (desain
// "PM Task Detail.dc.html": badge BUAT/UBAH/HAPUS/NOTIFIKASI berwarna,
// BUKAN nama action mentah seperti sebelumnya). Setiap action baru butuh
// dipetakan ke salah satu 4 kategori ini, fallback UBAH untuk yang belum
// dipetakan.
function activityTypeMeta(action: string): { label: string; className: string } {
  const create = { label: 'BUAT', className: 'border-mint text-mint' }
  const update = { label: 'UBAH', className: 'border-blue text-blue' }
  const remove = { label: 'HAPUS', className: 'border-destructive text-destructive' }
  const notify = { label: 'NOTIFIKASI', className: 'border-violet text-violet' }
  switch (action) {
    case 'task.created':
    case 'task.dependency_added':
    case 'task.pic_added':
    case 'attachment.uploaded':
    case 'attachment.restored':
      return create
    case 'task.deleted':
    case 'task.dependency_removed':
    case 'task.pic_removed':
    case 'attachment.deleted':
      return remove
    case 'task.pic_acknowledged':
      return notify
    default:
      return update
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
  // workspaceId (IG-97 susulan, tab LAMPIRAN "KUOTA ORGANISASI") -- modal
  // ini sebelumnya cuma tahu projectId, ditambah supaya bisa reuse
  // useDocumentsQuota existing (AW Documents) tanpa endpoint baru.
  workspaceId: string
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
// Finish-to-Start (Phase 3, S4-51/52, susulan disamakan penuh dengan
// desain -- kartu predecessor/successor + pencarian kandidat + DUA aksi
// per baris "MENUNGGU INI"/"MEMBLOKIR INI" arah dibalik; LINGKARAN
// DEPENDENCY tetap teks error polos bukan panel khusus, simplifikasi kecil
// diterima), tombol "Mulai Pengerjaan". PIC FASE (susulan disamakan penuh
// dengan desain, 3 kapabilitas backend BARU yang sebelumnya tidak ada sama
// sekali -- lihat service/task_pic.go): "+ Tambah PIC Paralel" (co-PIC
// tanpa melepas yang lain), "SERAHKAN PIC FASE" (satu PIC tertentu atau
// SEMUA PIC aktif digantikan sekaligus), "✕ HAPUS PIC" (PM/AW only,
// ditolak kalau PIC terakhir). Ketiganya digerbangi PIC Group Full vs
// Terbatas yang SAMA PERSIS dengan SetStatus (reuse isFullPicMode, bukan
// aturan baru). Acknowledge TETAP self-only (cuma PIC bersangkutan sendiri
// yang bisa acknowledge miliknya -- desain menyiratkan PM/AW bisa
// acknowledge ATAS NAMA PIC lain, TIDAK dibangun, simplifikasi kecil
// diterima karena backend Acknowledge sejak awal mengunci ke actor
// sendiri). WAKTU STATUS (susulan 2026-09-25 disamakan penuh dengan
// desain, kartu stat sebelumnya QUEUE/ACTIVE/LEAD TIME diganti PERSIS 4
// kartu desain -- LEAD TIME/ACTIVE TIME/FLOW EFFICIENCY (Active÷Lead)/
// REGRESI, reuse `task.data.regression_count` yang sudah ada, bukan
// hitung ulang dari sesi): AKUMULASI PER STATUS dapat bar proporsional
// queue/active + kolom TOTAL, TIMELINE SESI jadi kartu penuh (badge
// warna status asli, stamps masuk/keluar+aktor, badge regresi/TIDAK
// DILACAK). BACKLOG/DONE SENGAJA dikecualikan dari queue/active
// (`isUntrackedStatusTime`) -- backend `CloseActiveSession` auto-fill
// `work_started_at` untuk SEMUA status termasuk keduanya (S4-67), tanpa
// filter ini ACTIVE TIME salah menghitung waktu tunggu backlog/idle
// selesai sebagai pengerjaan aktual; filter ini murni tampilan tab ini
// (variabel lokal komponen, tidak menyentuh data lain). + widget
// Timesheet (start/stop timer + entri manual + approval AW/PM, IG-97/
// US-036/037 -- DIMAJUKAN dari Sprint S8 asli, TIDAK ADA di desain
// "PM Task Detail.dc.html" sendiri jadi ditaruh di sini sebagai section
// tambahan, keputusan penempatan disengaja). RIWAYAT VERSI (snapshot
// deskripsi tiap disimpan, IG-97, susulan 2026-09-25: versi terbaru
// disorot border+nomor signal, versi lama netral -- sebelumnya semua
// nomor versi signal seragam) dan AKTIVITAS (feed audit_logs task,
// menutup IG-94 -- audit_logs task sebelumnya kosong total sejak Phase 1,
// susulan 2026-09-25: badge kategori BUAT/UBAH/HAPUS/NOTIFIKASI berwarna
// -- `activityTypeMeta` -- menggantikan label action mentah, plus
// jump-to-page melengkapi paginasi "Grid 1" yang sebelumnya cuma
// Sblm/Berikutnya) KEDUANYA sudah disamakan dengan desain. Field
// `hasFiles`/`files` per-versi desain SENGAJA tidak diikutkan --
// duplikat data lampiran yang sudah ada sendiri di tab LAMPIRAN.
// LAMPIRAN (susulan 2026-09-25 disamakan penuh
// dengan desain): box "KUOTA ORGANISASI" (reuse useDocumentsQuota existing
// AW Documents, threshold 80%/95% SAMA PERSIS -- workspaceId baru jadi
// prop modal ini khusus untuk ini) + gate upload diblokir total saat
// 100%, dan paste screenshot dari clipboard (Ctrl+V) sebagai jalur upload
// tambahan (validasi sama persis handleUpload biasa, bukan jalur
// terpisah). Section desain "LAMPIRAN DARI KOMENTAR" SENGAJA tidak
// dibangun -- task_comments belum ada sama sekali di codebase ini (lihat
// features/attachments/types.ts), bukan simplifikasi tapi memang belum
// ada data sumbernya. rename/hapus di FE cuma ditampilkan untuk
// pengunggah sendiri (server tetap mengizinkan PM/AW lewat endpoint yang
// sama; PM/AW mengelola lampiran user lain lewat halaman "AW Documents",
// bukan dari modal ini). PIC handoff TETAP picker checklist
// polos (bukan alur 2-langkah "SERAHKAN DARI"→"SERAHKAN KE" desain saat
// PIC aktif >1) -- simplifikasi kecil diterima, sama pola PicPickerModal
// Kanban.
export default function TaskDetailModal({ taskId, onClose, projectId, workspaceId, statuses }: TaskDetailModalProps) {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const task = useTask(taskId)
  const members = useProjectMembers(projectId, true)
  const sprints = useProjectSprints(projectId)
  const projectTasks = useProjectTasks(projectId)
  const update = useUpdateTask(projectId)
  const setStatus = useSetTaskStatus(projectId)
  const remove = useDeleteTask(projectId)
  const acknowledge = useAcknowledgePic(taskId ?? '')
  const picHistory = usePicHistory(taskId)
  const addPic = useAddPic(projectId)
  const handoffPic = useHandoffPic(projectId)
  const removePic = useRemovePic(projectId)
  const setCompleteness = useSetCompleteness(projectId)
  const dependencies = useTaskDependencies(taskId)
  const addDependency = useAddDependency(projectId)
  const removeDependency = useRemoveDependency(projectId)
  const startWork = useStartWork(taskId ?? '')
  const statusSessions = useTaskStatusSessions(taskId)
  const attachments = useTaskAttachments(taskId)
  const quota = useDocumentsQuota(workspaceId)
  const uploadAttachment = useUploadAttachment(taskId ?? '')
  const renameAttachment = useRenameAttachment(taskId ?? '')
  const deleteAttachmentMut = useDeleteAttachment(taskId ?? '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activityPageInputRef = useRef<HTMLInputElement>(null)
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
  const [sprintId, setSprintId] = useState<string | null>(null)
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
  const [picError, setPicError] = useState('')
  // picAddSearch/picHandoffFrom/picTabError -- tab PIC FASE "+ Tambah PIC
  // Paralel"/"SERAHKAN PIC FASE" (IG-97 susulan). picHandoffFrom: '' (PIC
  // aktif tunggal, tidak perlu dipilih) | 'ALL' | user_id PIC aktif yang
  // mau diserahterimakan.
  const [picAddSearch, setPicAddSearch] = useState('')
  const [picHandoffFrom, setPicHandoffFrom] = useState('')
  const [picTabError, setPicTabError] = useState('')
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
      setSprintId(task.data.sprint_id)
    }
    setActiveTab('overview')
    setActivityPage(1)
    setFieldEditing(false)
    setNotice('')
    setPendingStatusId(null)
    setPicSelection([])
    setPicError('')
    setPicAddSearch('')
    setPicHandoffFrom('')
    setPicTabError('')
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
      storyPoints !== task.data.story_points ||
      sprintId !== task.data.sprint_id)

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
      setSprintId(task.data.sprint_id)
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
          sprint_id: sprintId,
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
  // diklik langsung dari baris kandidat. direction 'predecessor'
  // ("MENUNGGU INI") = kandidat jadi predecessor task ini (task ini
  // menunggu kandidat). direction 'successor' ("MEMBLOKIR INI") = arah
  // dibalik, task ini jadi predecessor dari kandidat (task ini memblokir
  // kandidat) -- sesuai desain PM Task Detail.dc.html.
  const onAddDependency = (candidateId: string, direction: 'predecessor' | 'successor') => {
    const vars = direction === 'predecessor' ? { taskId, predecessorTaskId: candidateId } : { taskId: candidateId, predecessorTaskId: taskId }
    addDependency.mutate(vars, {
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
    })
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

  // onPasteImage (IG-97 susulan, tab LAMPIRAN "tempel screenshot dari
  // clipboard") -- gambar dari clipboard diperlakukan SAMA seperti upload
  // biasa lewat handleUpload (validasi ekstensi/ukuran/kuota yang sama,
  // tidak ada jalur terpisah). Nama file diberi timestamp karena
  // clipboard image biasanya tidak punya nama file asli.
  const onPasteImage = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
    if (!item) return
    e.preventDefault()
    const blob = item.getAsFile()
    if (!blob) return
    const ext = item.type.split('/')[1] || 'png'
    handleUpload(new File([blob], `paste-${Date.now()}.${ext}`, { type: item.type }))
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

  // pic*ErrorMessage -- pesan generik per kode error backend, dipakai
  // ketiga aksi PIC FASE baru (IG-97 susulan). Kode PIC_NOT_IN_GROUP/
  // PIC_ALREADY_ACTIVE bisa muncul dari AddPic maupun HandoffPic.
  const picErrorMessage = (err: unknown, fallback: string): string => {
    const apiErr = err as { code?: string }
    switch (apiErr.code) {
      case 'PIC_NOT_IN_GROUP':
        return 'PIC Group status ini belum memuat member yang Anda pilih. Minta Project Manager menambah anggota PIC Group.'
      case 'PIC_ALREADY_ACTIVE':
        return 'User ini sudah menjadi PIC aktif pada fase ini.'
      case 'PIC_LAST_ACTIVE':
        return 'Tidak dapat menghapus PIC terakhir -- gunakan Serah Terima PIC.'
      case 'FORBIDDEN':
        return 'Hanya Project Manager dan Admin Workspace yang boleh menghapus PIC fase.'
      default:
        return fallback
    }
  }

  const onAddPic = (userId: string) => {
    setPicTabError('')
    addPic.mutate(
      { taskId, userId },
      {
        onSuccess: () => setPicAddSearch(''),
        onError: (err: unknown) => setPicTabError(picErrorMessage(err, 'Gagal menambah PIC.')),
      },
    )
  }

  const onHandoffPic = (toUserId: string) => {
    setPicTabError('')
    handoffPic.mutate(
      { taskId, fromUserId: picHandoffFrom === 'ALL' ? '' : picHandoffFrom, toUserId },
      {
        onSuccess: () => { setPicHandoffFrom(''); setPicAddSearch('') },
        onError: (err: unknown) => setPicTabError(picErrorMessage(err, 'Gagal menyerahkan PIC.')),
      },
    )
  }

  const onRemovePic = (userId: string) => {
    setPicTabError('')
    removePic.mutate({ taskId, userId }, { onError: (err: unknown) => setPicTabError(picErrorMessage(err, 'Gagal menghapus PIC.')) })
  }

  const activePics = task.data?.active_pics ?? []
  const isCreatorOrActivePic = task.data != null && (task.data.created_by === currentUserId || activePics.some((p) => p.user_id === currentUserId))
  const showCompletenessToggle = task.data?.status_name === 'BACKLOG' && isCreatorOrActivePic

  // picCandidates -- kandidat "SERAHKAN PIC FASE"/"+ Tambah PIC Paralel"
  // (IG-97 susulan), sumber SAMA `members` (project member assignable)
  // yang sudah dipakai picker status-change -- backend yang menegakkan
  // PIC Group Full vs Terbatas (PIC_NOT_IN_GROUP), FE tidak menduplikasi
  // logika itu (pola sama picSelection checklist di PINDAHKAN STATUS).
  const picAddSearchLower = picAddSearch.trim().toLowerCase()
  const picCandidates = (members.data ?? [])
    .filter((m) => !activePics.some((p) => p.user_id === m.user_id))
    .filter((m) => !picAddSearchLower || (m.display_name || '').toLowerCase().includes(picAddSearchLower) || m.email.toLowerCase().includes(picAddSearchLower))
  const picHistoryList = picHistory.data ?? []

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

  // isUntrackedStatusTime (IG-97 susulan, desain "PM Task Detail.dc.html"
  // timeNote: "Waktu dicatat otomatis di setiap status KECUALI BACKLOG dan
  // DONE") -- CloseActiveSession backend auto-fill work_started_at=entered_at
  // untuk SEMUA status termasuk BACKLOG/DONE (S4-67), jadi tanpa filter ini
  // "ACTIVE TIME" akan salah menghitung waktu tunggu di BACKLOG/idle di DONE
  // sebagai pengerjaan aktual. Filter ini MURNI tampilan tab ini (queueMs/
  // activeMs/statusTotals lokal ke komponen, tidak dipakai halaman lain).
  const isUntrackedStatusTime = (statusName: string) => statusName === 'BACKLOG' || statusName === 'DONE'

  const statusColorByName = (statusName: string, statusId: string) => {
    const st = statuses.find((s) => s.id === statusId) ?? statuses.find((s) => s.name === statusName)
    return statusColorClasses(st?.color_token ?? null)
  }

  const resolveActorName = (userId: string | null) => {
    if (!userId) return 'Sistem/Rule'
    return members.data?.find((m) => m.user_id === userId)?.display_name || 'Anggota lain'
  }

  // activeMs (top stat "ACTIVE TIME"/"FLOW EFFICIENCY") -- HANYA sesi
  // status tracked (bukan BACKLOG/DONE). leadMs TETAP mencakup seluruh
  // rentang (termasuk BACKLOG) -- itu justru esensi Lead Time vs Cycle
  // Time (desain: "created_at -> status_entered_at(Done)").
  let activeMs = 0
  for (const s of sessions) {
    if (isUntrackedStatusTime(s.status_name)) continue
    const started = s.work_started_at ? new Date(s.work_started_at).getTime() : null
    if (started == null) continue
    const exited = s.exited_at ? new Date(s.exited_at).getTime() : Date.now()
    activeMs += exited - started
  }
  const leadMs = sessions.length > 0 ? (sessions[sessions.length - 1].exited_at ? new Date(sessions[sessions.length - 1].exited_at!).getTime() : Date.now()) - new Date(sessions[0].entered_at).getTime() : 0
  const flowPct = sessions.length > 0 && leadMs > 0 ? Math.round((activeMs / leadMs) * 100) : null
  const regressionCount = task.data?.regression_count ?? 0

  // statusTotals (IG-97, WAKTU STATUS "AKUMULASI PER STATUS") -- sesi
  // digabung per status_name, TIDAK direset saat mundur (sama catatan
  // desain "sesi baru diakumulasi ke total"). totalMs dihitung untuk
  // SEMUA status (termasuk BACKLOG/DONE, "task duduk di status ini
  // selama..."), queue/active HANYA untuk status tracked.
  const statusTotals = new Map<string, { statusId: string; queueMs: number; activeMs: number; totalMs: number; sessionCount: number; regressionCount: number; tracked: boolean }>()
  for (const s of sessions) {
    const entered = new Date(s.entered_at).getTime()
    const started = s.work_started_at ? new Date(s.work_started_at).getTime() : null
    const exited = s.exited_at ? new Date(s.exited_at).getTime() : Date.now()
    const tracked = !isUntrackedStatusTime(s.status_name)
    const entry = statusTotals.get(s.status_name) ?? { statusId: s.status_id, queueMs: 0, activeMs: 0, totalMs: 0, sessionCount: 0, regressionCount: 0, tracked }
    entry.sessionCount += 1
    entry.totalMs += exited - entered
    if (s.is_regression) entry.regressionCount += 1
    if (tracked && started != null) {
      entry.queueMs += started - entered
      entry.activeMs += exited - started
    }
    statusTotals.set(s.status_name, entry)
  }
  const statusTotalsMax = Math.max(1, ...Array.from(statusTotals.values()).map((t) => t.totalMs))

  // myActiveEntry -- entri time_entries pending milik user sendiri (untuk
  // gate tombol approve/reject: bukan approver tetap bisa lihat, backend
  // yang menolak kalau bukan AW/PM, sama pola "tampilkan semua, backend
  // yang menegakkan" di seluruh modal ini).
  const timerRunningHere = activeTimer.data != null

  const isOverdue = Boolean(task.data?.due_date && task.data.due_date < new Date().toISOString().slice(0, 10) && task.data.status_name !== 'DONE')
  const loggedHours = (task.data?.logged_minutes ?? 0) / 60
  const isOverEstimate = Boolean(task.data?.estimated_hours && loggedHours > task.data.estimated_hours)

  // quotaPct/quotaCritical/quotaWarn (IG-97 susulan, tab LAMPIRAN "KUOTA
  // ORGANISASI") -- threshold SAMA PERSIS AwDocumentsPage (95%/80%), bukan
  // angka baru.
  const quotaPct = quota.data && quota.data.quota_bytes > 0 ? Math.min(100, (quota.data.used_bytes / quota.data.quota_bytes) * 100) : 0
  const quotaCritical = quotaPct >= 95
  const quotaWarn = quotaPct >= 80
  const quotaFull = quotaPct >= 100

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
                      memisah DESKRIPSI jadi tombol simpan sendiri). SPRINT
                      ditambahkan susulan 2026-09-25 (diminta user, gap
                      ditemukan lewat pengujian: pindah sprint task tidak
                      bisa lewat sini sama sekali sebelumnya, cuma tampilan
                      baca-saja di fields grid) -- picker chip sama pola
                      AddTaskModal. */}
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
                        {(sprints.data ?? []).length > 0 && (
                          <div>
                            <label className="mb-2 block font-mono text-[8.5px] tracking-[0.14em] text-text-dim">SPRINT</label>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSprintId(null)}
                                className={cn('border px-2.5 py-1.5 font-mono text-[9.5px]', sprintId === null ? 'border-signal bg-signal/10 text-signal' : 'border-line-strong text-text-muted')}
                              >
                                Backlog (tanpa sprint)
                              </button>
                              {(sprints.data ?? []).map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setSprintId(s.id)}
                                  className={cn('border px-2.5 py-1.5 font-mono text-[9.5px]', sprintId === s.id ? 'border-signal bg-signal/10 text-signal' : 'border-line-strong text-text-muted')}
                                >
                                  {s.name}
                                  {s.status === 'active' ? ' · AKTIF' : ''}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
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
                          <div className="flex flex-shrink-0 gap-1.5">
                            <button
                              type="button"
                              onClick={() => onAddDependency(t.id, 'predecessor')}
                              disabled={addDependency.isPending}
                              title={`Task ini menunggu ${t.task_code ?? t.title} selesai (DONE) dulu`}
                              className="whitespace-nowrap border border-amber px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-amber disabled:opacity-40"
                            >
                              Menunggu Ini
                            </button>
                            <button
                              type="button"
                              onClick={() => onAddDependency(t.id, 'successor')}
                              disabled={addDependency.isPending}
                              title={`Task ini memblokir ${t.task_code ?? t.title} -- kandidat menunggu task ini selesai (DONE)`}
                              className="whitespace-nowrap border border-blue px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-blue disabled:opacity-40"
                            >
                              Memblokir Ini
                            </button>
                          </div>
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
                <div className="flex flex-col gap-4">
                  <div className="border border-line-strong bg-input-bg p-3.5">
                    <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">PIC FASE SAAT INI · {task.data.status_name}</div>
                    <div className="mt-2.5 flex flex-col gap-2">
                      {activePics.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 border border-line-strong p-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="text-[12.5px] text-text-bone">{p.user_name || p.user_email}</div>
                            <div className="font-mono text-[9px] text-text-dim">
                              ditetapkan {new Date(p.activated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {p.acknowledged_at ? ` · acknowledge ${new Date(p.acknowledged_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                            </div>
                          </div>
                          <span
                            className={cn(
                              'flex-shrink-0 whitespace-nowrap border px-2 py-0.5 font-mono text-[9px] tracking-[0.06em]',
                              p.acknowledged_at ? 'border-mint text-mint' : 'border-amber text-amber',
                            )}
                          >
                            {p.acknowledged_at ? 'AKTIF' : 'PENDING ACK'}
                          </span>
                          {!p.acknowledged_at && p.user_id === currentUserId && (
                            <button
                              type="button"
                              onClick={() => acknowledge.mutate(undefined, { onSuccess: () => setNotice('Serah terima PIC dikonfirmasi.') })}
                              disabled={acknowledge.isPending}
                              className="flex-shrink-0 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.06em] text-mint hover:underline"
                            >
                              ✓ Acknowledge
                            </button>
                          )}
                          {activePics.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onRemovePic(p.user_id)}
                              disabled={removePic.isPending}
                              className="flex-shrink-0 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.06em] text-destructive hover:underline"
                            >
                              ✕ Hapus PIC
                            </button>
                          )}
                        </div>
                      ))}
                      {activePics.length === 0 && <p className="font-mono text-[9.5px] text-text-dim">Tidak ada PIC aktif.</p>}
                    </div>
                    <p className="mt-2.5 font-mono text-[9.5px] leading-relaxed text-text-dim">
                      PIC fase bertanggung jawab menuntaskan task pada status {task.data.status_name}. Satu fase boleh punya lebih dari satu PIC aktif; setiap PIC baru berstatus PENDING sampai memberi acknowledge, dan setiap pergantian tercatat di riwayat PIC.
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 font-mono text-[8.5px] tracking-[0.14em] text-text-dim">ASSIGNEE TASK</div>
                    <div className="flex flex-wrap gap-1.5">
                      {task.data.assignees.map((a) => {
                        const active = activePics.some((p) => p.user_id === a.user_id)
                        const past = !active && picHistoryList.some((h) => h.user_id === a.user_id)
                        return (
                          <span
                            key={a.user_id}
                            className={cn(
                              'border px-2.5 py-1.5 font-mono text-[9.5px]',
                              active ? 'border-signal text-text-bone' : 'border-line-strong text-text-muted',
                              past && 'opacity-50',
                            )}
                          >
                            {a.display_name || a.email} <span className="text-text-dim">· {a.role}</span>
                            {active && <span className="ml-1.5 text-signal">· PIC FASE</span>}
                            {past && <span className="ml-1.5 text-text-dim">· PIC NON-AKTIF</span>}
                          </span>
                        )
                      })}
                      {task.data.assignees.length === 0 && <span className="font-mono text-[9.5px] text-text-dim">Belum ada assignee.</span>}
                    </div>
                  </div>

                  <div className="border-t border-line pt-4">
                    <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">SERAHKAN PIC FASE · TAMBAH PIC PARALEL</div>
                    <p className="mt-1.5 font-mono text-[9.5px] leading-relaxed text-text-muted">
                      Serah terima memindahkan tanggung jawab fase ini ke orang lain -- PIC lama dilepas dari task dan tetap tercatat di riwayat PIC. Tambah paralel menambah co-PIC tanpa melepas siapa pun; PIC baru wajib acknowledge.
                    </p>
                    {activePics.length > 1 && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[8.5px] tracking-[0.12em] text-text-dim">SERAHKAN DARI</span>
                        {activePics.map((p) => (
                          <button
                            key={p.user_id}
                            type="button"
                            onClick={() => setPicHandoffFrom(p.user_id)}
                            className={cn(
                              'border px-2.5 py-1 font-mono text-[9px]',
                              picHandoffFrom === p.user_id ? 'border-signal bg-signal/10 text-signal' : 'border-line-strong text-text-muted',
                            )}
                          >
                            {p.user_name || p.user_email}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPicHandoffFrom('ALL')}
                          className={cn(
                            'border px-2.5 py-1 font-mono text-[9px]',
                            picHandoffFrom === 'ALL' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-line-strong text-text-muted',
                          )}
                        >
                          SEMUA PIC
                        </button>
                      </div>
                    )}
                    <input
                      value={picAddSearch}
                      onChange={(e) => { setPicAddSearch(e.target.value); setPicTabError('') }}
                      placeholder="Cari member project"
                      className="mt-2.5 w-full border border-line-strong bg-input-bg px-3 py-2 text-[12.5px] text-text-bone outline-none focus-visible:border-signal"
                    />
                    {picTabError && <p className="mt-2 text-[10px] text-destructive">⚠ {picTabError}</p>}
                    <div className="mt-2.5 flex max-h-[200px] flex-col gap-1.5 overflow-y-auto">
                      {picCandidates.map((m) => (
                        <div key={m.user_id} className="flex items-center gap-2.5 border border-line-strong p-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] text-text-bone">{m.display_name || m.email}</div>
                            <div className="font-mono text-[9px] text-text-dim">{m.role} · {m.email}</div>
                          </div>
                          <div className="flex flex-shrink-0 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (activePics.length > 1 && !picHandoffFrom) { setPicTabError('Pilih PIC yang akan diserahkan dulu.'); return }
                                onHandoffPic(m.user_id)
                              }}
                              disabled={handoffPic.isPending || activePics.length === 0}
                              title="Serahkan tanggung jawab fase ini"
                              className="whitespace-nowrap border border-signal px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-signal disabled:opacity-40"
                            >
                              Serahkan →
                            </button>
                            <button
                              type="button"
                              onClick={() => onAddPic(m.user_id)}
                              disabled={addPic.isPending}
                              title="Tambah sebagai PIC paralel, tanpa melepas PIC lain"
                              className="whitespace-nowrap border border-blue px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-blue disabled:opacity-40"
                            >
                              + Paralel
                            </button>
                          </div>
                        </div>
                      ))}
                      {picCandidates.length === 0 && (
                        <p className="font-mono text-[9.5px] text-text-dim">{picAddSearch ? 'Tidak ada member yang cocok.' : 'Tidak ada kandidat PIC lain di project ini.'}</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-line pt-4">
                    <div className="mb-2 font-mono text-[8.5px] tracking-[0.14em] text-text-dim">RIWAYAT PIC</div>
                    <div className="flex flex-col gap-1.5">
                      {picHistoryList.filter((p) => !p.is_active).map((p) => (
                        <div key={p.id} className="flex items-center gap-3 border border-line-strong p-2.5">
                          <span className="flex-shrink-0 whitespace-nowrap border border-line-strong px-2 py-0.5 font-mono text-[8.5px] tracking-[0.08em] text-text-dim">
                            {p.status_name}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] text-text-bone">{p.user_name || p.user_email}</div>
                            <div className="font-mono text-[9px] text-text-dim">
                              aktif {new Date(p.activated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} → non-aktif{' '}
                              {p.deactivated_at ? new Date(p.deactivated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </div>
                          </div>
                          <span className="flex-shrink-0 whitespace-nowrap font-mono text-[8.5px] tracking-[0.08em] text-text-dim">NON-AKTIF</span>
                        </div>
                      ))}
                      {picHistoryList.filter((p) => !p.is_active).length === 0 && (
                        <p className="font-mono text-[9.5px] text-text-dim">Belum ada pergantian PIC pada task ini.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'attach' && (
                <div className="flex flex-col gap-4">
                  {quota.data && (
                    <div className={cn('border p-3', quotaCritical ? 'border-destructive bg-destructive/5' : 'border-line-strong bg-input-bg')}>
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">KUOTA ORGANISASI</span>
                        <span className={cn('ml-auto font-mono text-[9.5px]', quotaCritical ? 'text-destructive' : quotaWarn ? 'text-amber' : 'text-mint')}>
                          {formatBytes(quota.data.used_bytes)} / {formatBytes(quota.data.quota_bytes)} ({quotaPct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 bg-panel">
                        <div
                          className={cn('h-full', quotaCritical ? 'bg-destructive' : quotaWarn ? 'bg-amber' : 'bg-signal')}
                          style={{ width: `${quotaPct}%` }}
                        />
                      </div>
                      <p className="mt-2 font-mono text-[9px] leading-relaxed text-text-dim">
                        Kuota berlaku untuk seluruh organisasi, bukan cuma task ini. Retensi file terhapus {quota.data.retention_days} hari. Minta tambah kuota lewat halaman "AW Documents".
                      </p>
                    </div>
                  )}

                  {quotaFull ? (
                    <div className="border border-destructive bg-destructive/5 p-3 font-mono text-[9.5px] leading-relaxed text-destructive">
                      ⚠ Kuota storage organisasi telah habis -- upload lampiran baru diblokir di seluruh workspace organisasi ini. Hubungi Group Admin untuk menambah alokasi.
                    </div>
                  ) : (
                    <>
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
                      <div className="border border-dashed border-line-strong p-3">
                        <p className="mb-2 font-mono text-[9px] leading-relaxed text-text-muted">
                          Tempel screenshot dari clipboard (⌘V / Ctrl+V) di kolom bawah ini -- gambar diperlakukan sama seperti upload biasa.
                        </p>
                        <input
                          readOnly
                          value=""
                          onPaste={onPasteImage}
                          placeholder="Klik di sini lalu tempel gambar"
                          className="w-full border border-line-strong bg-input-bg px-3 py-2 font-mono text-[9.5px] text-text-bone outline-none focus-visible:border-signal"
                        />
                      </div>
                    </>
                  )}
                  {uploadAttachment.isPending && <p className="font-mono text-[9.5px] text-text-muted">Mengunggah...</p>}
                  {attachError && <p className="font-mono text-[10px] text-destructive">⚠ {attachError}</p>}

                  <div className="flex flex-col gap-1.5">
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
                                <div className="mt-0.5 font-mono text-[8.5px] text-text-dim">
                                  {isOwner ? 'Anda dapat mengganti nama dan menghapus berkas ini' : 'Rename & hapus hanya untuk pengunggah, Project Manager, atau Admin Workspace'}
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
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <div className="border border-line-strong bg-input-bg p-3">
                      <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">LEAD TIME</div>
                      <div className="mt-2 font-mono text-[16px] font-semibold text-text-bone">{formatDuration(leadMs)}</div>
                      <div className="mt-1.5 font-mono text-[8.5px] text-text-dim">created_at → status_entered_at(Done)</div>
                    </div>
                    <div className="border border-line-strong bg-input-bg p-3">
                      <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">ACTIVE TIME</div>
                      <div className="mt-2 font-mono text-[16px] font-semibold text-mint">{formatDuration(activeMs)}</div>
                      <div className="mt-1.5 font-mono text-[8.5px] text-text-dim">akumulasi seluruh sesi pengerjaan aktual</div>
                    </div>
                    <div className="border border-line-strong bg-input-bg p-3">
                      <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">FLOW EFFICIENCY</div>
                      <div className={cn('mt-2 font-mono text-[16px] font-semibold', flowPct == null ? 'text-text-dim' : flowPct >= 40 ? 'text-mint' : flowPct >= 20 ? 'text-amber' : 'text-destructive')}>
                        {flowPct == null ? '—' : `${flowPct}%`}
                      </div>
                      <div className="mt-1.5 font-mono text-[8.5px] text-text-dim">Σ Active Time ÷ Lead Time</div>
                    </div>
                    <div className="border border-line-strong bg-input-bg p-3">
                      <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">REGRESI</div>
                      <div className={cn('mt-2 font-mono text-[16px] font-semibold', regressionCount > 0 ? 'text-destructive' : 'text-text-dim')}>{regressionCount}×</div>
                      <div className="mt-1.5 font-mono text-[8.5px] text-text-dim">
                        {regressionCount > 0 ? 'PM & Admin Workspace sudah dinotifikasi' : 'belum pernah mundur status'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 font-mono text-[8.5px] tracking-[0.14em] text-text-dim">AKUMULASI PER STATUS · SESI DIGABUNG, TIDAK DIRESET SAAT MUNDUR</div>
                    <div className="flex flex-col gap-1.5">
                      {Array.from(statusTotals.entries()).map(([statusName, t]) => {
                        const colors = statusColorByName(statusName, t.statusId)
                        return (
                          <div key={statusName} className="flex flex-wrap items-center gap-3 border border-line-strong bg-input-bg p-2.5 font-mono text-[9px]">
                            <span className={cn('flex-shrink-0 whitespace-nowrap border px-2 py-0.5 font-semibold', colors.border, colors.text)}>{statusName}</span>
                            <span className="flex-shrink-0 text-text-dim">
                              {t.sessionCount} sesi{t.regressionCount > 0 ? ` · ${t.regressionCount}× masuk lewat regresi` : ''}
                            </span>
                            <span className="block h-1.5 min-w-[100px] flex-1 bg-panel">
                              <span className="block h-full bg-amber float-left" style={{ width: t.tracked ? `${Math.round((t.queueMs / statusTotalsMax) * 100)}%` : '0%' }} />
                              <span className="block h-full bg-mint float-left" style={{ width: t.tracked ? `${Math.round((t.activeMs / statusTotalsMax) * 100)}%` : '0%' }} />
                            </span>
                            <span className="flex-shrink-0 whitespace-nowrap text-amber">QUEUE {t.tracked ? formatDuration(t.queueMs) : '—'}</span>
                            <span className="flex-shrink-0 whitespace-nowrap text-mint">ACTIVE {t.tracked ? formatDuration(t.activeMs) : '—'}</span>
                            <span className="min-w-[64px] flex-shrink-0 whitespace-nowrap text-right text-[10px] font-semibold text-text-bone">{formatDuration(t.totalMs)}</span>
                          </div>
                        )
                      })}
                      {statusTotals.size === 0 && <p className="font-mono text-[9px] text-text-dim">Belum ada sesi status.</p>}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 font-mono text-[8.5px] tracking-[0.14em] text-text-dim">TIMELINE SESI · KRONOLOGIS</div>
                    <div className="flex flex-col gap-1.5">
                      {sessions.slice().reverse().map((s) => {
                        const colors = statusColorByName(s.status_name, s.status_id)
                        const untracked = isUntrackedStatusTime(s.status_name)
                        const open = s.exited_at === null
                        const entered = new Date(s.entered_at).getTime()
                        const exited = s.exited_at ? new Date(s.exited_at).getTime() : Date.now()
                        const started = s.work_started_at ? new Date(s.work_started_at).getTime() : null
                        const waiting = !untracked && open && started == null
                        const workNote = untracked
                          ? ''
                          : waiting
                            ? '⏳ menunggu -- tombol Mulai Pengerjaan belum diklik, pengerjaan belum dihitung'
                            : s.is_auto_start
                              ? '⏱ auto -- tombol Mulai Pengerjaan tidak diklik, work_started_at = status_entered_at'
                              : `work_started_at ${s.work_started_at ? new Date(s.work_started_at).toLocaleString('id-ID') : '—'}`
                        return (
                          <div
                            key={s.id}
                            className={cn(
                              'flex flex-col gap-1.5 border bg-input-bg p-2.5',
                              open ? 'border-signal' : s.is_regression ? 'border-destructive' : 'border-line-strong',
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn('flex-shrink-0 whitespace-nowrap border px-2 py-0.5 font-mono text-[9px] font-semibold', colors.border, colors.text)}>
                                {s.status_name} — SESI {s.session_no}
                              </span>
                              {s.is_regression && (
                                <span className="flex-shrink-0 whitespace-nowrap border border-destructive px-1.5 py-0.5 font-mono text-[8.5px] text-destructive">↩ MASUK LEWAT REGRESI</span>
                              )}
                              {untracked && (
                                <span className="flex-shrink-0 whitespace-nowrap border border-line-strong px-1.5 py-0.5 font-mono text-[8.5px] text-text-dim">TIDAK DILACAK</span>
                              )}
                              <span className={cn('ml-auto flex-shrink-0 whitespace-nowrap font-mono text-[10px] font-semibold', open ? 'text-signal' : 'text-text-bone')}>
                                {formatDuration(exited - entered)}{open ? ' · BERJALAN' : ''}
                              </span>
                            </div>
                            <div className="font-mono text-[9px] leading-relaxed text-text-muted">
                              masuk {new Date(s.entered_at).toLocaleString('id-ID')}
                              {s.exited_at ? ` → keluar ${new Date(s.exited_at).toLocaleString('id-ID')}` : ' → masih di status ini'}
                              {' · aktor '}{resolveActorName(s.triggered_by)}
                            </div>
                            {!untracked && (
                              <div className="flex flex-wrap gap-2.5 font-mono text-[9px]">
                                <span className="text-amber">QUEUE {started != null ? formatDuration(started - entered) : '—'}</span>
                                <span className="text-mint">ACTIVE {started != null ? formatDuration(exited - started) : '—'}</span>
                                <span className="text-text-dim">{workNote}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {sessions.length === 0 && <p className="font-mono text-[9px] text-text-dim">Belum ada sesi.</p>}
                    </div>
                  </div>

                  <div className="border border-line-strong bg-input-bg p-3 font-mono text-[9.5px] leading-relaxed text-text-muted">
                    Waktu dicatat otomatis di setiap status kecuali BACKLOG dan DONE. Saat task mundur, durasi status tidak direset -- sesi baru diakumulasi ke total dan direkam terpisah untuk audit. Data ini menjadi sumber Cycle Time, Bottleneck Detection, Flow Efficiency, dan Regression Rate di Performance Dashboard.
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
                      <div key={v.id} className={cn('border bg-input-bg p-3', i === 0 ? 'border-signal' : 'border-line-strong')}>
                        <div className="flex flex-wrap items-baseline gap-2.5">
                          <span className={cn('font-mono text-[9.5px] font-semibold', i === 0 ? 'text-signal' : 'text-text-dim')}>v{(versions.data?.length ?? 0) - i}</span>
                          <span className="font-mono text-[9px] text-text-dim">
                            {v.changed_by_name || v.changed_by_email} · {new Date(v.snapshot_at).toLocaleString('id-ID')}
                          </span>
                          <span className="ml-auto font-mono text-[9px] text-signal">{v.trigger}</span>
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
                    {(activity.data?.items ?? []).map((a) => {
                      const typeMeta = activityTypeMeta(a.action)
                      return (
                        <div key={a.id} className="flex gap-2.5 border border-line-strong bg-input-bg p-3">
                          <span className={cn('h-fit flex-shrink-0 whitespace-nowrap border px-2 py-0.5 font-mono text-[8.5px] tracking-[0.06em]', typeMeta.className)}>
                            {typeMeta.label}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12.5px] text-text-bone">{describeTaskAction(a.action, a.state_before, a.state_after, a.metadata)}</div>
                            <div className="mt-1 font-mono text-[9px] text-text-dim">
                              {a.actor_name || a.actor_email || 'Sistem'} {a.actor_role ? `· ${a.actor_role}` : ''} · {new Date(a.logged_at).toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {(activity.data?.items ?? []).length === 0 && (
                      <p className="font-mono text-[9.5px] leading-relaxed text-text-dim">
                        Belum ada aktivitas tercatat untuk task ini. Perubahan status, role, lampiran, dan dependency akan muncul di sini.
                      </p>
                    )}
                  </div>
                  {(activity.data?.total ?? 0) > 10 && (() => {
                    const totalPages = Math.max(1, Math.ceil((activity.data?.total ?? 0) / 10))
                    const goToActivityPage = (raw: string) => {
                      const n = parseInt(raw, 10)
                      if (!Number.isFinite(n)) return
                      setActivityPage(Math.min(totalPages, Math.max(1, n)))
                    }
                    return (
                      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 font-mono text-[9.5px]">
                        <button
                          type="button"
                          onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                          disabled={activityPage <= 1}
                          className="border border-line-strong px-2.5 py-1 uppercase text-text-muted disabled:opacity-30"
                        >
                          ◄ Sblm
                        </button>
                        <span className="flex items-center gap-1.5 text-text-dim">
                          Halaman
                          <input
                            key={activityPage}
                            ref={activityPageInputRef}
                            type="number"
                            min={1}
                            max={totalPages}
                            defaultValue={activityPage}
                            onKeyDown={(e) => e.key === 'Enter' && goToActivityPage(e.currentTarget.value)}
                            className="w-11 border border-line-strong bg-input-bg px-1 py-0.5 text-center font-mono text-[10px] text-text-body outline-none focus-visible:border-signal"
                            aria-label="Nomor halaman"
                          />
                          / {totalPages} · {activity.data?.total ?? 0} data
                          <button
                            type="button"
                            onClick={() => goToActivityPage(activityPageInputRef.current?.value ?? '')}
                            className="border border-line-strong px-1.5 py-0.5 font-mono text-[9px] uppercase text-text-muted"
                          >
                            Ke
                          </button>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActivityPage((p) => (p * 10 < (activity.data?.total ?? 0) ? p + 1 : p))}
                          disabled={activityPage * 10 >= (activity.data?.total ?? 0)}
                          className="ml-auto border border-line-strong px-2.5 py-1 uppercase text-text-muted disabled:opacity-30"
                        >
                          Brkt ►
                        </button>
                      </div>
                    )
                  })()}
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
