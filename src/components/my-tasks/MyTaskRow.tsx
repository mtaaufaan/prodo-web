import { metaLine, progressInfo } from '@/features/my-tasks/myTaskStats'
import type { MyTask } from '@/features/my-tasks/types'
import { statusColorClasses, type TaskPriority } from '@/features/tasks/types'
import { cn } from '@/lib/utils'

const PRIORITY_TEXT: Record<TaskPriority, string> = {
  low: 'text-text-muted',
  medium: 'text-blue',
  high: 'text-amber',
  critical: 'text-red',
}

interface MyTaskRowProps {
  task: MyTask
  canMove: boolean
  canComment: boolean
  onMove: (task: MyTask) => void
  onComment: (task: MyTask) => void
}

// Satu baris "TM Task Saya.dc.html": kode, judul, meta, badge status/prioritas,
// bar progres sub-task + jam, aksi STATUS-BERIKUTNYA → dan ✎ KOMENTAR.
export default function MyTaskRow({ task, canMove, canComment, onMove, onComment }: MyTaskRowProps) {
  const status = statusColorClasses(task.status_color)
  const progress = progressInfo(task)
  const showMove = canMove && task.next_status !== null
  const readOnly = !showMove && !canComment

  return (
    <div className="flex flex-col gap-[9px] border-t border-line px-[15px] py-[13px] first:border-t-0">
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 pt-0.5 font-mono text-[8.5px] text-text-muted">{task.task_code}</span>
        <div className="min-w-0 flex-1 leading-[1.4]">
          <div className="text-[13px] text-text-bone">{task.title}</div>
          <div className="mt-[5px] font-mono text-[8.5px] leading-[1.7] text-text-dim">{metaLine(task)}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-[5px]">
          <span className={cn('border px-1.5 py-[3px] font-mono text-[8.5px] font-semibold', status.text, status.border)}>{task.status_name}</span>
          <span className={cn('font-mono text-[8.5px] font-semibold uppercase', PRIORITY_TEXT[task.priority])}>{task.priority}</span>
        </div>
      </div>

      {progress.show && (
        <div>
          <div className="mb-[5px] flex gap-[9px]">
            <span className="font-mono text-[8.5px] text-text-muted">{progress.label}</span>
            <span className={cn('ml-auto font-mono text-[8.5px]', progress.overBudget ? 'text-red' : 'text-text-muted')}>{progress.hours}</span>
          </div>
          <div className="h-1.5 bg-input-bg">
            <div className={cn('h-full', progress.done ? 'bg-mint' : 'bg-blue')} style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {showMove && task.next_status && (
          <button
            type="button"
            onClick={() => onMove(task)}
            className="border border-mint/50 px-[9px] py-[5px] font-mono text-[9.5px] text-mint"
          >
            {task.next_status.name} →
          </button>
        )}
        {canComment && (
          <button type="button" onClick={() => onComment(task)} className="border border-line-strong px-[9px] py-[5px] font-mono text-[9.5px] text-text-body">
            ✎ KOMENTAR
          </button>
        )}
        {readOnly && <span className="font-mono text-[9px] text-text-dim">🔒 Hanya baca — role Anda tidak dapat mengubah task ini</span>}
      </div>
    </div>
  )
}
