import { useEffect, useRef, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import CommentModal from '@/components/my-tasks/CommentModal'
import MyTaskRow from '@/components/my-tasks/MyTaskRow'
import Grid1Pager from '@/components/shared/Grid1Pager'
import AddTaskModal from '@/components/tasks/AddTaskModal'
import PicPickerModal from '@/components/tasks/PicPickerModal'
import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import { useMyContext } from '@/features/context/hooks'
import { useMyTasks, usePostComment } from '@/features/my-tasks/hooks'
import type { MyTask, MyTaskView } from '@/features/my-tasks/types'
import { useProjectMembers } from '@/features/project-members/hooks'
import { useProjects } from '@/features/projects/hooks'
import { useSetTaskStatus } from '@/features/tasks/hooks'
import { describeMoveError } from '@/features/tasks/moveError'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const PER_PAGE = 10
const NOTICE_MS = 15000

const EDITOR_CAP_NOTE =
  'Dapat mengubah task yang ditugaskan, mencatat waktu, dan berkomentar. Tidak dapat menyetujui atau mengubah struktur project.'

// MyTasksPage -- "TM Task Saya.dc.html" (S6E-03, Sprint 6 Editor Console).
// Cakupan = project aktif di URL (switcher sidebar). Data dari GET /me/tasks (S6E-04):
// baris satu halaman, total, dan statistik 4 kartu dihitung server.
export default function MyTasksPage() {
  const { wsId = '', projectId = '' } = useParams<{ wsId: string; projectId: string }>()
  const { view, registerCta } = useOutletContext<WorkspaceOutletContext>()
  const taskView: MyTaskView = view === 'Diikuti' ? 'following' : 'assigned'
  const follow = taskView === 'following'

  const ctx = useMyContext()
  const membership = ctx.data?.workspace_memberships.find((w) => w.workspace_id === wsId) ?? ctx.data?.project_scoped_projects.find((p) => p.workspace_id === wsId)
  const caps = membership?.capabilities
  const roleLabel = (membership?.role ?? 'editor').toUpperCase().replace(/_/g, ' ')

  const projects = useProjects(wsId)
  const projectName = projects.data?.find((p) => p.id === projectId)?.name ?? '—'
  const [page, setPage] = useState(1)
  const tasks = useMyTasks(projectId, taskView, page, PER_PAGE)
  const members = useProjectMembers(projectId, true)
  const setStatus = useSetTaskStatus(projectId)
  const postComment = usePostComment()

  const [notice, setNotice] = useState('')
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>()
  const [commentTask, setCommentTask] = useState<MyTask | null>(null)
  const [pendingMove, setPendingMove] = useState<MyTask | null>(null)
  const [moveError, setMoveError] = useState('')
  const [addTaskOpen, setAddTaskOpen] = useState(false)

  const showNotice = (text: string) => {
    setNotice(text)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), NOTICE_MS)
  }
  useEffect(() => () => clearTimeout(noticeTimer.current), [])
  useEffect(() => setPage(1), [taskView, projectId])
  useEffect(() => {
    registerCta(() => setAddTaskOpen(true))
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registerCta stabil dari useCallback shell
  }, [])

  const visible = tasks.data?.items ?? []
  const total = tasks.data?.total ?? 0
  const stats = tasks.data?.stats ?? { total: 0, running: 0, logged_hours: 0, late: 0 }

  const runMove = (task: MyTask, picIds: string[]) => {
    if (!task.next_status) return
    const next = task.next_status
    setMoveError('')
    setStatus.mutate(
      { taskId: task.task_id, statusId: next.id, picIds },
      {
        onSuccess: () => {
          setPendingMove(null)
          showNotice(`${task.task_code} dipindahkan ke ${next.name}. Tercatat di Audit Trail.`)
        },
        onError: (err: unknown) => setMoveError(describeMoveError(err)),
      },
    )
  }
  const requestMove = (task: MyTask) => {
    setMoveError('')
    if (task.next_status?.require_pic === false) runMove(task, [])
    else setPendingMove(task)
  }

  const submitComment = async (text: string): Promise<string> => {
    const task = commentTask
    if (!task) return ''
    let notified = 0
    try {
      notified = (await postComment.mutateAsync({ taskId: task.task_id, body: text })).notified
    } catch (err) {
      return err instanceof ApiError && err.code === 'FORBIDDEN' ? 'Role Anda tidak dapat berkomentar pada task ini.' : 'Gagal mengirim komentar. Coba lagi.'
    }
    setCommentTask(null)
    showNotice(`Komentar terkirim pada ${task.task_code}${notified ? ` · ${notified} mention diberi notifikasi.` : '.'}`)
    return ''
  }

  const cards = [
    { label: 'TASK SAYA', value: String(stats.total), note: projectName.toUpperCase(), tone: 'text-text-bone' },
    { label: 'BERJALAN', value: String(stats.running), note: 'SEDANG DIKERJAKAN', tone: 'text-blue' },
    { label: 'JAM TERCATAT', value: stats.logged_hours.toFixed(1), note: 'PADA TASK SAYA', tone: 'text-violet' },
    { label: 'TERLAMBAT', value: String(stats.late), note: 'LEWAT DUE DATE', tone: 'text-red' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-content p-6">
      <div className="flex flex-wrap items-center gap-[9px] px-0.5 pb-3">
        <span className={cn('border px-2 py-1 font-mono text-[8.5px] tracking-[0.12em]', caps?.edit_own_task ? 'border-mint text-mint' : 'border-text-muted text-text-muted')}>
          AKSES {roleLabel}
        </span>
        <span className="font-mono text-[8.5px] leading-[1.6] text-text-dim">{EDITOR_CAP_NOTE}</span>
      </div>

      {notice && (
        <div className="relative mb-3 border border-mint p-[11px_34px_11px_13px] font-mono text-[10px] leading-[1.7] text-mint">
          ✓ {notice}
          <button type="button" onClick={() => setNotice('')} title="Tutup" className="absolute right-[7px] top-[5px] px-[5px] py-[3px] font-mono text-[11px] leading-none opacity-60">
            ✕
          </button>
        </div>
      )}
      {moveError && !pendingMove && (
        <div className="mb-3 flex items-start gap-2 border border-red p-[11px_13px] font-mono text-[10px] leading-[1.7] text-red">
          <span className="flex-1">⚠ {moveError}</span>
          <button type="button" onClick={() => setMoveError('')}>
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 px-0.5 pb-3.5">
        {cards.map((c) => (
          <div key={c.label} className="min-w-[104px] flex-1 border border-line bg-panel px-[15px] py-[13px]">
            <div className="font-mono text-[9px] tracking-[0.12em] text-text-muted">{c.label}</div>
            <div className={cn('mt-[5px] text-[23px] font-extrabold', c.tone)}>{c.value}</div>
            <div className="mt-[5px] font-mono text-[8.5px] text-text-dim">{c.note}</div>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-line">
        <div className="flex-1 overflow-auto">
          {tasks.isLoading && <div className="p-[30px_14px] text-center font-mono text-[10.5px] text-text-dim">Memuat...</div>}
          {tasks.isError && <div className="p-[30px_14px] text-center font-mono text-[10.5px] text-red">Gagal memuat task.</div>}
          {visible.map((t) => (
            <MyTaskRow
              key={t.task_id}
              task={t}
              canMove={Boolean(caps?.edit_own_task)}
              canComment={Boolean(caps?.comment)}
              onMove={requestMove}
              onComment={setCommentTask}
            />
          ))}
          {tasks.isSuccess && total === 0 && (
            <div className="p-[30px_14px] text-center font-mono text-[10.5px] leading-[1.8] text-text-dim">
              {follow ? 'Anda belum mengikuti task mana pun.' : 'Tidak ada task yang ditugaskan kepada Anda.'}
            </div>
          )}
        </div>
        <div className="border-t border-line bg-raised px-3.5 py-[11px] font-mono text-[9px] leading-[1.8] text-text-muted">
          {follow
            ? 'Task yang Anda ikuti mengirim notifikasi saat statusnya berubah, mengikuti aturan cooldown mention workspace.'
            : 'Anda hanya melihat task pada project yang Anda ikuti. Perubahan status task tercatat di Audit Trail.'}
        </div>
        <Grid1Pager page={page} perPage={PER_PAGE} total={total} onPage={setPage} />
      </div>

      {commentTask && (
        <CommentModal code={commentTask.task_code} taskTitle={commentTask.title} onSubmit={submitComment} onClose={() => setCommentTask(null)} />
      )}
      <PicPickerModal
        open={pendingMove !== null}
        title={pendingMove?.next_status ? `Pindahkan ke ${pendingMove.next_status.name}` : ''}
        note="Pindah status wajib menetapkan PIC fase baru."
        members={members.data ?? []}
        onConfirm={(picIds) => pendingMove && runMove(pendingMove, picIds)}
        onCancel={() => {
          setPendingMove(null)
          setMoveError('')
        }}
        isPending={setStatus.isPending}
        errorMessage={moveError}
      />
      <AddTaskModal open={addTaskOpen} onClose={() => setAddTaskOpen(false)} projectId={projectId} projectName={projectName === '—' ? '' : projectName} />
    </div>
  )
}
